import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import NoteEditor from '@/components/notes/NoteEditor.vue';

const dictation = {
  emits: ['state-change', 'transcribed'],
  template: `<div>
    <button @click="$emit('state-change', 'recording')">Start recording</button>
    <button @click="$emit('transcribed', 'ex', false)">Partial transcript</button>
    <button @click="$emit('transcribed', 'excerpt', true)">Final transcript</button>
    <button @click="$emit('state-change', 'idle')">Stop recording</button>
  </div>`,
};

describe('NoteEditor', () => {
  it('replaces the partial transcript at the same insertion point and ignores transcription after stopping', async () => {
    const { emitted, container } = render(NoteEditor, {
      props: { modelValue: '<p>(from the ledger)</p>' },
      global: { stubs: { VoiceCaptureButton: dictation } },
    });
    const note = () => container.querySelector('.ProseMirror p');
    const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

    await screen.findByRole('button', { name: 'Final transcript' });
    await press('Final transcript');
    expect(emitted('update:modelValue')).toBeUndefined();
    await press('Start recording');
    await press('Partial transcript');
    expect(note()?.textContent).toContain('ex');
    await press('Final transcript');
    expect(note()?.textContent).toBe('excerpt(from the ledger)');
    expect(emitted('update:modelValue')?.at(-1)).toEqual(['<p>excerpt(from the ledger)</p>']);

    await press('Stop recording');
    await press('Partial transcript');
    expect(note()?.textContent).toBe('excerpt(from the ledger)');
  });

  it('reflects a newly loaded note and applies heading controls without dictation', async () => {
    const { container, emitted, rerender } = render(NoteEditor, {
      props: { modelValue: null, dictation: false },
    });
    expect(screen.queryByRole('button', { name: 'Start recording' })).toBeNull();
    await screen.findByRole('button', { name: 'H2' });
    await rerender({ modelValue: '<p>Archive finding</p>' });
    expect(container.querySelector('.ProseMirror p')?.textContent).toBe('Archive finding');

    await fireEvent.click(screen.getByRole('button', { name: 'H2' }));
    await waitFor(() => expect(container.querySelector('.ProseMirror h2')?.textContent).toBe('Archive finding'));
    expect(emitted('update:modelValue')?.at(-1)).toEqual([expect.stringContaining('<h2>Archive finding</h2>')]);
    await rerender({ modelValue: null });
    expect(container.querySelector('.ProseMirror p')?.textContent).toBe('');
  });
});
