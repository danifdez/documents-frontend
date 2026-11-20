import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import QuickAssistant from '@/pages/QuickAssistant.vue';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { Workspace } from '@/types/Workspace';
import type { Assistant, AssistantMessage } from '@/types/Assistant';
import type { Agent } from '@/types/Agent';

const { api, subscribe, setApiBaseUrl } = vi.hoisted(() => ({
  api: { get: vi.fn(), post: vi.fn() }, subscribe: vi.fn(), setApiBaseUrl: vi.fn(),
}));
vi.mock('@/services/api', () => ({ default: api, setApiBaseUrl }));
vi.mock('@/services/notifications/notification', () => ({ reconnectSocket: vi.fn() }));
vi.mock('@/services/notifications/executionPublication', () => ({ subscribeExecutionPublication: subscribe }));

const workspace: Workspace = { id: 'archive', type: 'remote', name: 'Archives', url: 'https://archive.example' };
const other: Workspace = { ...workspace, id: 'catalogue', name: 'Catalogue', url: 'https://catalogue.example' };
const assistants: Assistant[] = [
  { id: 10, name: 'Research Assistant', sub: 'Personal research', icon: null, folderScope: null, lastSeenAt: null, createdAt: '', updatedAt: '' },
  { id: 11, name: 'Reference Assistant', sub: null, icon: '✦', folderScope: null, lastSeenAt: null, createdAt: '', updatedAt: '' },
];
const agent: Agent = {
  id: 20, name: 'Cataloguer', sub: 'Classifies references', icon: '⊕', folderScope: null,
  systemPrompt: null, pinned: true, lastSeenAt: null, expiresAt: null, createdAt: '', updatedAt: '',
};
const hide = vi.fn();
const unregister = vi.fn();
const onShown = vi.fn();
const getActiveWorkspace = vi.fn();
const getWorkspaces = vi.fn();
const events = new Map<string, Array<(data: Record<string, unknown>) => void>>();
const composer = () => screen.getByRole('textbox', { name: 'Message the assistant' }) as HTMLTextAreaElement;
const button = (name: string | RegExp) => screen.getByRole('button', { name });
let agentList: Agent[];
let assistantList: Assistant[];
let shown: () => void;

function openQuickAssistant(initialized = true, available = true) {
  const pinia = createPinia();
  const store = useWorkspaceStore(pinia);
  store.initialized = initialized;
  store.workspaces = available ? [workspace] : [];
  store.activeWorkspace = available ? workspace : null;
  const view = render(QuickAssistant, { global: { plugins: [pinia] } });
  return { view, store };
}

function message(id: number, role: 'assistant' | 'user', content: string): Omit<AssistantMessage, 'assistantId'> {
  return { id, role, content, event: null, error: null, createdAt: '2026-01-01', executionId: 'task' };
}

function publish(name: string, event: Record<string, unknown>) {
  for (const listener of events.get(name) ?? []) listener(event);
}

beforeEach(() => {
  vi.resetAllMocks();
  events.clear();
  agentList = [agent];
  assistantList = [...assistants];
  getActiveWorkspace.mockResolvedValue(workspace);
  getWorkspaces.mockResolvedValue([workspace, other]);
  onShown.mockImplementation((callback) => { shown = callback; return unregister; });
  vi.stubGlobal('quickAssistant', { hide, onShown });
  vi.stubGlobal('electronAPI', { getActiveWorkspace, getWorkspaces, getDefaultWorkspace: async (): Promise<string | null> => null });
  subscribe.mockImplementation((name, listener) => {
    events.set(name, [...(events.get(name) ?? []), listener]);
    return vi.fn();
  });
  api.get.mockImplementation(async (url: string) => {
    if (url === '/assistants') return { data: assistantList };
    if (url === '/agents') return { data: agentList };
    if (url === '/execution-confirmations') return { data: [] };
    if (/^\/(assistants|agents)\/\d+\/messages$/.test(url)) return { data: { messages: [], hasMore: false } };
    if (url === '/executions/task/progress') return { data: { runtime: { status: 'running', activeSteps: [] } } };
    throw new Error(`Unexpected GET ${url}`);
  });
  api.post.mockImplementation(async (_url: string, payload: { content: string }) => ({
    data: { userMessage: message(71, 'user', payload.content), executionId: 'task' },
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('desktop Quick Assistant', () => {
  it('waits for workspace initialization and initializes conversation lists when available', async () => {
    const { store } = openQuickAssistant(false, false);
    expect(screen.getByText('Starting the assistant…')).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
    store.initialized = true;
    expect(await screen.findByText('Open Documents to set up a workspace first.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    store.workspaces = [workspace];
    store.activeWorkspace = workspace;
    const ready = await screen.findByPlaceholderText('Message Research Assistant… (Shift+Enter for a new line)');
    expect(ready).toBe(composer());
    expect(api.get).toHaveBeenCalledWith('/assistants/10/messages', { params: { limit: 50 } });
    expect(api.get).toHaveBeenCalledWith('/agents');
  });

  it.each([
    { type: 'assistant', selector: /Research Assistant Personal research/, endpoint: '/assistants/10/messages', ownerId: 10, response: 'assistantResponse' },
    { type: 'agent', selector: /Cataloguer Classifies references/, endpoint: '/agents/20/messages', ownerId: 20, response: 'agentResponse' },
  ])('routes messages and durable replies to the active $type', async ({ type, selector, endpoint, ownerId, response }) => {
    openQuickAssistant();
    await screen.findByPlaceholderText('Message Research Assistant… (Shift+Enter for a new line)');
    if (type === 'agent') {
      await fireEvent.click(button(/Research Assistant Personal research/));
      await fireEvent.click(button(selector));
      expect(await screen.findByPlaceholderText(/Message Cataloguer/)).toBeTruthy();
    }
    await fireEvent.update(composer(), '  Summarize the catalogue  ');
    await fireEvent.click(button('Send'));
    expect(api.post).toHaveBeenCalledExactlyOnceWith(endpoint, { content: 'Summarize the catalogue' });
    expect(await screen.findByText('Summarize the catalogue')).toBeTruthy();
    expect(composer().disabled).toBe(true);
    expect(composer().placeholder).toBe('Waiting for response…');

    publish(response, { [type + 'Id']: ownerId, message: message(72, 'assistant', '**Catalogue ready.**') });
    expect(await screen.findByText('Catalogue ready.')).toBeTruthy();
    expect(composer().disabled).toBe(false);
  });

  it('offers an alternate personal conversation and closes the chooser on outside click', async () => {
    agentList = [];
    openQuickAssistant();
    await screen.findByPlaceholderText(/Message Research Assistant/);
    const opener = button(/Research Assistant Personal research/);
    await fireEvent.click(opener);
    expect(screen.getByText("You don't have any agents yet.")).toBeTruthy();
    await fireEvent.click(document.body);
    expect(screen.queryByText("You don't have any agents yet.")).toBeNull();
    await fireEvent.click(opener);
    await fireEvent.click(button(/Reference Assistant Your personal assistant/));
    await screen.findByPlaceholderText(/Message Reference Assistant/);
    expect(api.get).toHaveBeenCalledWith('/assistants/11/messages', { params: { limit: 50 } });
  });

  it('keeps the chat if the workspace is unchanged and reselects the personal assistant on a switch', async () => {
    const { store } = openQuickAssistant();
    await screen.findByPlaceholderText(/Message Research Assistant/);
    await fireEvent.click(button(/Research Assistant Personal research/));
    await fireEvent.click(button(/Cataloguer Classifies references/));
    await screen.findByPlaceholderText(/Message Cataloguer/);
    shown();
    await waitFor(() => expect(getActiveWorkspace).toHaveBeenCalledOnce());
    expect(getWorkspaces).not.toHaveBeenCalled();
    expect(composer().placeholder).toMatch(/Message Cataloguer/);

    getActiveWorkspace.mockResolvedValue(other);
    shown();
    expect(await screen.findByPlaceholderText(/Message Research Assistant/)).toBeTruthy();
    expect(store.activeWorkspaceId).toBe(other.id);
    expect(setApiBaseUrl).toHaveBeenCalledExactlyOnceWith(other.url);
  });

  it('hides the popup on Escape or the close button and removes the window hooks on unmount', async () => {
    const { view } = openQuickAssistant();
    await screen.findByPlaceholderText(/Message Research Assistant/);
    expect(document.body.classList.contains('quick-assistant-window')).toBe(true);
    await fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(hide).not.toHaveBeenCalled();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    await fireEvent.click(screen.getByTitle('Close (Esc)'));
    expect(hide).toHaveBeenCalledTimes(2);
    view.unmount();
    await fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(hide).toHaveBeenCalledTimes(2);
    expect(unregister).toHaveBeenCalledOnce();
    expect(document.body.classList.contains('quick-assistant-window')).toBe(false);
  });
});
