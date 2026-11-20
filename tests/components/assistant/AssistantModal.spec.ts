import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AssistantModal from '@/components/assistant/AssistantModal.vue';
import type { Agent, CreateAgentPayload } from '@/types/Agent';
import type { Assistant } from '@/types/Assistant';

const { api } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/services/api', () => ({ default: api }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: () => () => {} }));

const personal: Assistant = {
  id: 3, name: 'Research assistant', icon: '◇', sub: 'Personal research',
  folderScope: null, lastSeenAt: null, createdAt: '', updatedAt: '',
};
const cataloguer: Agent = {
  id: 4, name: 'Catalogue specialist', sub: 'Classifies entries', icon: '✦', systemPrompt: 'Classify archive records.',
  folderScope: '/test/catalogue', pinned: true, expiresAt: null, lastSeenAt: null, createdAt: '', updatedAt: '',
};
const pick = vi.fn();
const ask = vi.fn();
const alert = vi.fn();
const button = (name: string) => screen.getByRole('button', { name });
const header = () => within(screen.getByRole('heading', { level: 2 }).closest('header')!);
const dialog = (name: string) => within(screen.getByRole('heading', { name }).parentElement!.parentElement!);
let assistant: Assistant;
let agents: Agent[];

async function openModal() {
  const view = render(AssistantModal, { props: { modelValue: false }, global: { plugins: [createPinia()] } });
  await view.rerender({ modelValue: true });
  await screen.findByPlaceholderText(/Message Research assistant/);
  return view;
}

async function selectAgent() {
  await fireEvent.click(await within(screen.getByRole('heading', { name: 'Agents' }).closest('aside')!).findByText(cataloguer.name));
  await screen.findByRole('heading', { name: cataloguer.name });
}

beforeEach(() => {
  vi.resetAllMocks();
  assistant = { ...personal };
  agents = [{ ...cataloguer }];
  vi.stubGlobal('folderScope', { pick });
  vi.stubGlobal('confirm', ask);
  vi.stubGlobal('alert', alert);
  api.get.mockImplementation(async (url: string) => {
    if (url === '/assistants') return { data: [assistant] };
    if (url === '/agents') return { data: [...agents] };
    if (url === '/agents/4') return { data: agents.find((agent) => agent.id === 4) };
    if (url.endsWith('/messages')) return { data: { messages: [], hasMore: false } };
    if (['/execution-confirmations', '/assistants/3/memory', '/assistants/3/indexed-files'].includes(url)) return { data: [] };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.patch.mockImplementation(async (url: string, payload: Partial<Agent>) => {
    if (url === '/assistants/3/working-folder') {
      assistant = { ...assistant, folderScope: payload.folderScope ?? null };
      return { data: assistant };
    }
    const updated = { ...agents[0], ...payload };
    agents[0] = updated;
    return { data: updated };
  });
  api.post.mockImplementation(async (_url: string, payload: CreateAgentPayload) => ({
    data: { ...cataloguer, id: 6, ...payload },
  }));
  api.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('assistant workspace dialog', () => {
  it('switches between the assistant memory and working folder panels and handles Escape in order', async () => {
    const view = await openModal();
    await fireEvent.click(header().getByTitle('Assistant memory'));
    expect(api.get).toHaveBeenCalledWith('/assistants/3/memory');
    await fireEvent.click(header().getByTitle('Working folder files'));
    expect(screen.getByText('Choose a working folder to make its files available here.')).toBeTruthy();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Choose a working folder to make its files available here.')).toBeNull();
    expect(view.emitted()['update:modelValue']).toBeUndefined();
    await fireEvent.keyDown(document, { key: 'Escape' });
    expect(view.emitted()['update:modelValue']).toEqual([[false]]);
  });

  it('displays picker and save errors and sets or removes the assistant folder after confirmation', async () => {
    await openModal();
    pick.mockResolvedValueOnce(null).mockResolvedValue('/test/research');
    await fireEvent.click(header().getByTitle('Choose assistant working folder'));
    expect(api.patch).not.toHaveBeenCalled();
    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Folder unavailable' } } });
    await fireEvent.click(header().getByTitle('Choose assistant working folder'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Folder unavailable'));
    await fireEvent.click(header().getByTitle('Choose assistant working folder'));
    expect(pick).toHaveBeenCalledWith({ title: 'Pick the assistant working folder' });
    await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/assistants/3/working-folder', { folderScope: '/test/research' }));
    expect(await screen.findByText(/No files yet/)).toBeTruthy();
    expect(header().getByText('/test/research')).toBeTruthy();

    ask.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fireEvent.click(header().getByTitle('Remove assistant working folder'));
    expect(api.patch).toHaveBeenCalledTimes(2);
    await fireEvent.click(header().getByTitle('Remove assistant working folder'));
    expect(api.patch).toHaveBeenLastCalledWith('/assistants/3/working-folder', { folderScope: null });
    await waitFor(() => expect(header().queryByText('/test/research')).toBeNull());
  });

  it('changes the active conversation and requires confirmation before unfavoriting an existing agent', async () => {
    await openModal();
    await selectAgent();
    expect(header().getByText('This agent only has access to its working folder.')).toBeTruthy();
    expect(header().queryByTitle('Assistant memory')).toBeNull();
    expect(header().getByText('/test/catalogue')).toBeTruthy();
    await fireEvent.click(header().getByTitle('Unfavorite'));
    await fireEvent.click(dialog('Unfavorite this agent?').getByRole('button', { name: 'Cancel' }));
    expect(api.patch).not.toHaveBeenCalled();

    await fireEvent.click(header().getByTitle('Unfavorite'));
    await fireEvent.click(button('OK, unfavorite'));
    expect(api.patch).toHaveBeenCalledExactlyOnceWith('/agents/4', { pinned: false });
    await fireEvent.click(await header().findByTitle("Favorite (won't expire)"));
    expect(api.patch).toHaveBeenLastCalledWith('/agents/4', { pinned: true });
  });

  it('creates a named agent with the chosen folder and instructions', async () => {
    await openModal();
    await fireEvent.click(button('+ New'));
    expect((button('Create') as HTMLButtonElement).disabled).toBe(true);
    await fireEvent.update(screen.getByLabelText('Name'), '  Reference checker  ');
    await fireEvent.update(screen.getByLabelText(/Short description/), '  Compares citations  ');
    await fireEvent.update(screen.getByLabelText(/Instructions/), '  Check each DOI.  ');
    pick.mockResolvedValueOnce('/test/reference');
    await fireEvent.click(button('Choose folder…'));
    await fireEvent.click(screen.getByRole('checkbox', { name: /^Favorite/ }));
    await fireEvent.click(button('Create'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/agents', {
      name: 'Reference checker', sub: 'Compares citations', systemPrompt: 'Check each DOI.',
      icon: undefined, folderScope: '/test/reference', pinned: true,
    });
    expect(await screen.findByText('Reference checker')).toBeTruthy();
  });

  it('edits fresh agent metadata, handles a changed folder, and keeps the form available after a failed save', async () => {
    await openModal();
    await selectAgent();
    await fireEvent.click(header().getByTitle('Edit agent'));
    await flushPromises();
    expect(api.get).toHaveBeenCalledWith('/agents/4');
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe(cataloguer.name);
    await fireEvent.click(button('Remove'));
    expect(screen.getByText('Indexed files from the previous folder will no longer be available.')).toBeTruthy();
    await fireEvent.update(screen.getByLabelText('Name'), 'Revised specialist');
    api.patch.mockRejectedValueOnce({ response: { data: { message: 'Name already used' } } });
    await fireEvent.click(button('Save'));
    expect(await screen.findByText('Name already used')).toBeTruthy();
    await fireEvent.click(button('Save'));
    expect(api.patch).toHaveBeenLastCalledWith('/agents/4', expect.objectContaining({
      name: 'Revised specialist', pinned: true, folderScope: null,
    }));
    expect(await screen.findByRole('heading', { name: 'Revised specialist' })).toBeTruthy();
    expect(header().getByText(/no working folder configured/)).toBeTruthy();
  });

  it('only deletes the chosen agent when the desktop confirmation accepts it', async () => {
    await openModal();
    await selectAgent();
    await fireEvent.click(header().getByTitle('Edit agent'));
    ask.mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fireEvent.click(button('Delete'));
    expect(api.delete).not.toHaveBeenCalled();
    await fireEvent.click(button('Delete'));
    expect(api.delete).toHaveBeenCalledExactlyOnceWith('/agents/4');
    expect(await screen.findByText(/You don't have any agents yet/)).toBeTruthy();
  });
});
