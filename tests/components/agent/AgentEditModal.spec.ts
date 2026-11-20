import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentEditModal from '@/components/agent/AgentEditModal.vue';
import type { Agent } from '@/types/Agent';

const { api, confirm } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }, confirm: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: vi.fn() }));

const sample: Agent = {
  id: 18, name: 'Inventory helper', systemPrompt: null, folderScope: '/test/sources', icon: null, sub: null,
  pinned: true, lastSeenAt: null, expiresAt: null, createdAt: '', updatedAt: '',
};
const button = (name: string) => screen.getByRole('button', { name });
const label = (name: RegExp | string) => screen.getByLabelText(name);
const favorite = () => screen.getByRole('checkbox', { name: /^Favorite/ }) as HTMLInputElement;
const open = (agent: Agent | null = null) => {
  const changed = vi.fn();
  const view = render(AgentEditModal, { props: {
    modelValue: true, agent, 'onUpdate:modelValue': changed,
  }, global: { plugins: [createPinia()] } });
  return { view, changed };
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('confirm', confirm);
  api.get.mockResolvedValue({ data: sample });
  api.post.mockResolvedValue({ data: sample });
  api.patch.mockResolvedValue({ data: sample });
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => vi.unstubAllGlobals());

describe('agent settings', () => {
  it('creates a favorite agent with a selected working folder and trimmed preferences', async () => {
    const folder = { pick: vi.fn().mockResolvedValue('/test/references') };
    vi.stubGlobal('folderScope', folder);
    const { changed } = open();
    expect((button('Create') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(label('Name'), '  Catalogue helper  ');
    await fireEvent.update(label(/^Short description/), '  Sort book titles  ');
    await fireEvent.update(label(/^Instructions/), ' List catalogue titles. ');
    await fireEvent.click(button('Choose folder…'));
    expect(await screen.findByTitle('/test/references')).toBeTruthy();
    expect(folder.pick).toHaveBeenCalledExactlyOnceWith({ title: 'Pick the agent working folder' });
    await fireEvent.click(favorite());
    await fireEvent.click(button('Create'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/agents', {
      name: 'Catalogue helper', sub: 'Sort book titles', systemPrompt: 'List catalogue titles.',
      icon: undefined, folderScope: '/test/references', pinned: true,
    });
    await waitFor(() => expect(changed).toHaveBeenCalledExactlyOnceWith(false));
  });

  it('loads the latest settings and requires confirmation before removing favorite status', async () => {
    api.get.mockResolvedValueOnce({ data: { ...sample, name: 'Updated inventory helper' } });
    const { changed } = open(sample);
    await waitFor(() => expect((label('Name') as HTMLInputElement).value).toBe('Updated inventory helper'));
    await fireEvent.click(button('Remove'));
    expect(screen.getByText('Indexed files from the previous folder will no longer be available.')).toBeTruthy();
    await fireEvent.click(favorite());
    const dialog = screen.getByRole('heading', { name: 'Unfavorite this agent?' }).parentElement!.parentElement!;
    await fireEvent.click(within(dialog).getByRole('button', { name: 'OK, unfavorite' }));
    expect(favorite().checked).toBe(false);
    await fireEvent.click(button('Save'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/agents/18', expect.objectContaining({
      name: 'Updated inventory helper', folderScope: null, pinned: false,
    }));
    await waitFor(() => expect(changed).toHaveBeenCalledExactlyOnceWith(false));
  });

  it('retains local data on reload failure and only deletes after confirmation', async () => {
    api.get.mockRejectedValueOnce(new Error('The server is unavailable'));
    const { changed } = open(sample);
    expect(await screen.findByText('The server is unavailable')).toBeTruthy();
    expect((label('Name') as HTMLInputElement).value).toBe(sample.name);
    confirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fireEvent.click(button('Delete'));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(button('Delete'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/agents/18');
    await waitFor(() => expect(changed).toHaveBeenCalledExactlyOnceWith(false));
  });
});
