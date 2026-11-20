import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ChatSidebar from '@/components/ui/ChatSidebar.vue';

const state = vi.hoisted(() => ({ post: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('@/services/api', () => ({ default: { post: state.post } }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: state.subscribe }));

const question = () => screen.getByRole('textbox', { name: 'Ask a question' }) as HTMLInputElement;
const send = () => screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement;

beforeEach(() => {
  vi.resetAllMocks();
  state.post.mockResolvedValue({ data: {} });
  state.subscribe.mockReturnValue(state.unsubscribe);
});

describe('asking about a resource', () => {
  it('focuses the question on open and correlates the answer with the request ID', async () => {
    const sent = vi.fn();
    const close = vi.fn();
    const view = render(ChatSidebar, { props: {
      show: false, messages: [], projectId: 9, context: 'Holdings report', subtitle: 'Ask about this report', onSend: sent, onClose: close,
    } });
    await view.rerender({ show: true });
    await waitFor(() => expect(document.activeElement).toBe(question()));
    expect(screen.getByText('Ask about this report')).toBeTruthy();
    expect(screen.getByText('Ask anything')).toBeTruthy();
    expect(send().disabled).toBe(true);

    await fireEvent.update(question(), 'How many items were acquired?');
    await fireEvent.click(send());
    expect(sent).toHaveBeenCalledExactlyOnceWith('How many items were acquired?');
    expect(screen.getByText('How many items were acquired?')).toBeTruthy();
    expect(screen.getByText('Thinking...')).toBeTruthy();
    expect(question().disabled).toBe(true);

    const [path, request] = state.post.mock.calls[0];
    expect(path).toBe('/model/ask');
    expect(request).toEqual({
      question: 'How many items were acquired?', projectId: 9, context: 'Holdings report', requestId: expect.any(String),
    });
    const [channel, reply] = state.subscribe.mock.calls[1];
    expect(channel).toBe('askResponse');
    reply({ requestId: 'other' });
    expect(question().disabled).toBe(true);
    reply({ requestId: request.requestId });
    state.subscribe.mock.calls[0][1]({ requestId: request.requestId, response: 'The register lists ten items.' });
    expect(await screen.findByText('The register lists ten items.')).toBeTruthy();
    expect(question().disabled).toBe(false);
    expect(question().value).toBe('');

    await fireEvent.keyDown(question(), { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(state.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('keeps conversation history and restores the input after a failed send', async () => {
    state.post.mockRejectedValueOnce(new Error('Model unavailable'));
    render(ChatSidebar, { props: { show: true, messages: [{ role: 'assistant', text: 'Earlier answer' }] } });
    expect(screen.getByText('Earlier answer')).toBeTruthy();
    await fireEvent.update(question(), 'Follow-up question');
    await fireEvent.click(send());
    await waitFor(() => expect(question().disabled).toBe(false));
    expect(state.unsubscribe).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Follow-up question')).toBeTruthy();
    state.subscribe.mock.calls[0][1]({});
    expect(await screen.findByText('No response from assistant.')).toBeTruthy();
  });
});
