import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceCaptureButton from '@/components/voice/VoiceCaptureButton.vue';
import AssistantComposer from '@/components/assistant/AssistantComposer.vue';
import { VoiceCancelledError, type VoicePartial, type VoiceQueuedInfo } from '@/types/voice';

const { createDriver } = vi.hoisted(() => ({ createDriver: vi.fn() }));
vi.mock('@/services/voice/voiceDriverFactory', () => ({ createVoiceDriver: createDriver }));

const trackStop = vi.fn();
const requestMicrophone = vi.fn();
const unsubscribePartial = vi.fn();
const unsubscribeQueued = vi.fn();
const unsubscribeError = vi.fn();
let mediaDevicesDescriptor: PropertyDescriptor | undefined;
let emitPartial: (partial: VoicePartial) => void;
let emitQueued: (info: VoiceQueuedInfo) => void;
let emitDriverError: (error: Error) => void;
const driver = {
  start: vi.fn(),
  stop: vi.fn(),
  pushChunk: vi.fn(),
  cancel: vi.fn(),
  onPartial: vi.fn(),
  onQueued: vi.fn(),
  onError: vi.fn(),
};

const recorders: Recorder[] = [];
let stopFailure: boolean;
const options: Array<MediaRecorderOptions | undefined> = [];
const sliceSizes: number[] = [];

class Recorder extends EventTarget {
  static isTypeSupported = vi.fn();
  state = 'inactive';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  constructor(_stream: MediaStream, selected?: MediaRecorderOptions) {
    super();
    recorders.push(this);
    options.push(selected);
  }

  start(sliceMs: number) {
    sliceSizes.push(sliceMs);
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.dispatchEvent(new Event(stopFailure ? 'error' : 'stop'));
  }
}

const dictate = (button = 0) => fireEvent.pointerDown(screen.getByRole('button', { name: 'Start dictation' }), { button });
const release = () => window.dispatchEvent(new Event('pointerup'));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('MediaRecorder', Recorder);
  mediaDevicesDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: requestMicrophone }, configurable: true });
  requestMicrophone.mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
  createDriver.mockReturnValue(driver);
  driver.start.mockResolvedValue(undefined);
  driver.stop.mockResolvedValue(undefined);
  driver.cancel.mockResolvedValue(undefined);
  driver.onPartial.mockImplementation((callback: typeof emitPartial) => {
    emitPartial = callback;
    return unsubscribePartial;
  });
  driver.onQueued.mockImplementation((callback: typeof emitQueued) => {
    emitQueued = callback;
    return unsubscribeQueued;
  });
  driver.onError.mockImplementation((callback: typeof emitDriverError) => {
    emitDriverError = callback;
    return unsubscribeError;
  });
  options.length = 0;
  sliceSizes.length = 0;
  recorders.length = 0;
  stopFailure = false;
  Recorder.isTypeSupported.mockImplementation((type) => type === 'audio/webm');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (mediaDevicesDescriptor) Object.defineProperty(navigator, 'mediaDevices', mediaDevicesDescriptor);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
  vi.restoreAllMocks();
});

describe('push-to-talk voice capture', () => {
  it('starts on primary press, streams nonempty chunks and emits the finalized transcript after release', async () => {
    const view = render(VoiceCaptureButton, { props: { chunkMs: 300 } });
    await dictate(2);
    expect(requestMicrophone).not.toHaveBeenCalled();
    await dictate();
    expect(requestMicrophone).toHaveBeenCalledExactlyOnceWith({ audio: true });
    const recording = await screen.findByRole('button', { name: 'Stop dictation' });
    expect(recording.textContent).toContain('00:00');
    expect(options).toEqual([{ mimeType: 'audio/webm' }]);
    expect(sliceSizes).toEqual([300]);
    const chunk = new Blob(['voice data'], { type: 'audio/webm' });
    recorders.at(-1)!.ondataavailable?.({ data: new Blob() });
    recorders.at(-1)!.ondataavailable?.({ data: chunk });
    expect(driver.pushChunk).toHaveBeenCalledExactlyOnceWith(chunk);
    emitPartial({ text: 'The reference', isFinal: false });
    driver.stop.mockImplementationOnce(async () => {
      emitPartial({ text: 'The reference is ready.', isFinal: true });
    });
    release();
    await waitFor(() => expect(view.emitted().stateChange?.at(-1)).toEqual(['idle']));
    expect(view.emitted().transcribed).toEqual([['The reference', false], ['The reference is ready.', true]]);
    expect(driver.stop).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(unsubscribePartial).toHaveBeenCalledOnce();
    expect(unsubscribeError).toHaveBeenCalledOnce();
    expect(unsubscribeQueued).toHaveBeenCalledOnce();
  });

  it('does not open the microphone while disabled', async () => {
    render(VoiceCaptureButton, { props: { disabled: true } });
    expect((screen.getByRole('button', { name: 'Start dictation' }) as HTMLButtonElement).disabled).toBe(true);
    await dictate();
    expect(requestMicrophone).not.toHaveBeenCalled();
  });

  it('finishes the session if the user releases before microphone permission returns', async () => {
    const permission = Promise.withResolvers<{ getTracks: () => Array<{ stop: () => void }> }>();
    requestMicrophone.mockReturnValueOnce(permission.promise);
    const view = render(VoiceCaptureButton);
    await dictate();
    expect(screen.getByText('Permission…')).toBeTruthy();
    release();
    expect(driver.stop).not.toHaveBeenCalled();
    permission.resolve({ getTracks: () => [{ stop: trackStop }] });
    await waitFor(() => expect(view.emitted().stateChange?.at(-1)).toEqual(['idle']));
    expect(driver.stop).toHaveBeenCalledOnce();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('shows queue position and ETA while waiting and cancels without recording on release', async () => {
    const worker = Promise.withResolvers<void>();
    driver.start.mockReturnValueOnce(worker.promise);
    driver.cancel.mockImplementation(async () => { worker.reject(new VoiceCancelledError()); });
    const view = render(VoiceCaptureButton);
    await dictate();
    await waitFor(() => expect(driver.start).toHaveBeenCalled());
    emitQueued({ position: 0, eta: 0 });
    expect(await screen.findByText('Queued…')).toBeTruthy();
    emitQueued({ position: 2, eta: 0 });
    expect(await screen.findByText('Queued (2)')).toBeTruthy();
    emitQueued({ position: 2, eta: 65 });
    expect((await screen.findByRole('button', { name: 'Cancel wait' })).textContent).toContain('Queued (2) — 01:05');
    release();
    await waitFor(() => expect(view.emitted().stateChange?.at(-1)).toEqual(['idle']));
    expect(driver.cancel).toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalledOnce();
    expect(recorders).toHaveLength(0);
    expect(view.emitted().error).toBeUndefined();
  });

  it.each([
    { name: 'NotAllowedError', message: 'permission rejected', tooltip: 'Microphone permission denied. Enable it in your system settings.' },
    { name: 'NotFoundError', message: 'device missing', tooltip: 'No microphone detected.' },
  ])('shows the correct microphone error for $name', async ({ name, message, tooltip }) => {
    const failure = Object.assign(new Error(message), { name });
    requestMicrophone.mockRejectedValueOnce(failure);
    const view = render(VoiceCaptureButton);
    await dictate();
    expect(await screen.findByTitle(tooltip)).toBeTruthy();
    expect(view.emitted().error).toEqual([[failure]]);
    expect(createDriver).not.toHaveBeenCalled();
  });

  it('discards the stream on pointer cancellation or component unmount', async () => {
    const view = render(VoiceCaptureButton);
    await dictate();
    await screen.findByRole('button', { name: 'Stop dictation' });
    window.dispatchEvent(new Event('pointercancel'));
    await screen.findByRole('button', { name: 'Start dictation' });
    expect(driver.stop).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalledOnce();
    await dictate();
    await screen.findByRole('button', { name: 'Stop dictation' });
    view.unmount();
    expect(trackStop).toHaveBeenCalledTimes(2);
    expect(driver.cancel).toHaveBeenCalledTimes(2);
  });

  it('reports recorder finalization failures and stops capturing audio', async () => {
    const view = render(VoiceCaptureButton);
    await dictate();
    await screen.findByRole('button', { name: 'Stop dictation' });
    stopFailure = true;
    release();
    expect(await screen.findByTitle('Audio recording could not be finalized')).toBeTruthy();
    expect(view.emitted().error).toEqual([[expect.objectContaining({ message: 'Audio recording could not be finalized' })]]);
    expect(driver.stop).not.toHaveBeenCalled();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('ignores unavailable transport partials after a driver error and resets the microphone', async () => {
    const view = render(VoiceCaptureButton);
    await dictate();
    await screen.findByRole('button', { name: 'Stop dictation' });
    emitDriverError(new Error('Voice service disconnected'));
    emitPartial({ text: 'Too late', isFinal: false });
    expect(await screen.findByTitle('Voice service disconnected')).toBeTruthy();
    expect(view.emitted().transcribed).toBeUndefined();
    expect(trackStop).toHaveBeenCalledOnce();
  });

  it('replaces draft transcript text at the cursor and sends only after explicit confirmation', async () => {
    const view = render(AssistantComposer);
    const text = screen.getByRole('textbox', { name: 'Message the assistant' }) as HTMLTextAreaElement;
    await fireEvent.update(text, 'Check the catalogue');
    text.setSelectionRange(6, 6);
    await dictate();
    await screen.findByRole('button', { name: 'Stop dictation' });
    emitPartial({ text: 'section ', isFinal: false });
    await waitFor(() => expect(text.value).toBe('Check section the catalogue'));
    emitPartial({ text: 'index of ', isFinal: false });
    await waitFor(() => expect(text.value).toBe('Check index of the catalogue'));
    release();
    await screen.findByRole('button', { name: 'Start dictation' });
    expect(view.emitted().send).toBeUndefined();
    await fireEvent.keyDown(text, { key: 'Enter', shiftKey: true });
    expect(view.emitted().send).toBeUndefined();
    await fireEvent.keyDown(text, { key: 'Enter' });
    expect(view.emitted().send).toEqual([['Check index of the catalogue']]);
    expect(text.value).toBe('');
  });
});
