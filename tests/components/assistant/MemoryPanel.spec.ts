import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MemoryPanel from '@/components/assistant/MemoryPanel.vue';
import { useAssistantMemoryStore } from '@/store/assistantMemoryStore';
import type { MemoryEntry } from '@/types/AssistantMemory';

const { api, confirm, alert } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, confirm: vi.fn(), alert: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));

const example: MemoryEntry = {
  id: 'label-format', assistantId: 17, agentId: null, type: 'preference', name: 'Label format', body: 'Use catalogue numbers',
  contentHash: 'fixture', sourceKind: 'manual', consentStatus: 'granted', consentBasis: 'explicit_user_action',
  consentedAt: '', createdAt: '', updatedAt: '',
};
const record = (overrides: Partial<MemoryEntry>) => ({ ...example, ...overrides });
const button = (text: string) => screen.getByRole('button', { name: text });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('confirm', confirm);
  vi.stubGlobal('alert', alert);
  api.get.mockResolvedValue({ data: [] });
  api.delete.mockResolvedValue({ data: { deleted: 1 } });
});

afterEach(() => vi.unstubAllGlobals());

describe('assistant memory', () => {
  it('loads memories for the displayed assistant on open and retains the correct cache when switching', async () => {
    api.get.mockImplementation(async (path) => ({ data: path === '/assistants/17/memory'
      ? [example, record({ id: 'origin', name: 'Collection origin', body: 'East archive', type: 'fact', sourceKind: 'confirmed_tool' })]
      : [record({ id: 'visit', assistantId: 91, name: 'Visit date', body: 'Visited in May', type: 'episode' })] }));
    const changed = vi.fn();
    const view = render(MemoryPanel, { props: {
      show: false, assistantId: 17, 'onUpdate:show': changed,
    }, global: { plugins: [createPinia()] } });
    expect(api.get).not.toHaveBeenCalled();
    await view.rerender({ show: true });
    expect(await screen.findByText('Use catalogue numbers')).toBeTruthy();
    expect(screen.getByText('preference')).toBeTruthy();
    expect(screen.getByText('fact')).toBeTruthy();
    expect(screen.getByText('Confirmed by you · consent granted')).toBeTruthy();
    await view.rerender({ assistantId: 91 });
    expect(await screen.findByText('Visited in May')).toBeTruthy();
    expect(screen.getByText('episode')).toBeTruthy();
    expect(screen.queryByText('Use catalogue numbers')).toBeNull();
    await view.rerender({ assistantId: 17 });
    expect(screen.getByText('Use catalogue numbers')).toBeTruthy();
    expect(api.get.mock.calls).toEqual([['/assistants/17/memory'], ['/assistants/91/memory']]);
    await fireEvent.click(screen.getByTitle('Close (Esc)'));
    expect(changed).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('changes memory only after confirmation and keeps an entry visible if deletion fails', async () => {
    api.get.mockResolvedValue({ data: [example, record({ id: 'room', name: 'Room label', type: 'fact' })] });
    render(MemoryPanel, { props: { show: true, assistantId: 17 }, global: { plugins: [createPinia()] } });
    const name = await screen.findByText('Label format');
    const forget = () => within(name.closest('.group')!).getByRole('button', { name: 'Forget' });
    confirm.mockReturnValueOnce(false);
    await fireEvent.click(forget());
    expect(api.delete).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    api.delete.mockRejectedValueOnce(new Error('Memory store unavailable'));
    await fireEvent.click(forget());
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Memory store unavailable'));
    expect(screen.getByText('Label format')).toBeTruthy();
    await fireEvent.click(forget());
    await waitFor(() => expect(screen.queryByText('Label format')).toBeNull());
    expect(api.delete).toHaveBeenLastCalledWith('/assistants/17/memory/label-format');

    await fireEvent.click(button('Clear all memory'));
    expect(api.delete).toHaveBeenLastCalledWith('/assistants/17/memory');
    expect(await screen.findByText('No consented memories yet.')).toBeTruthy();
  });

  it('refreshes a memory in place and preserves other assistant scopes in the store', async () => {
    const store = useAssistantMemoryStore(createPinia());
    api.post.mockResolvedValueOnce({ data: example });
    api.patch.mockResolvedValueOnce({ data: { ...example, body: 'Use shelf marks' } });
    const target = { name: example.name, type: example.type, body: example.body };
    await store.add(17, target);
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/assistants/17/memory', target);
    await store.update(17, example.id, { body: 'Use shelf marks' });
    expect(store.entriesFor(17)).toEqual([{ ...example, body: 'Use shelf marks' }]);
    expect(store.entriesFor(91)).toEqual([]);
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/assistants/17/memory/label-format', { body: 'Use shelf marks' });
  });
});
