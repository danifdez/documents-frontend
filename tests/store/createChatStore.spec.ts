import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatStore } from '../../src/store/createChatStore';
import type { AssistantMessageEvent } from '../../src/types/Assistant';

const socketState = vi.hoisted(() => ({
  handlers: new Map<string, (event: Record<string, unknown>) => void>(),
  on: vi.fn(),
}));

vi.mock('@/services/notifications/notification', () => ({
  getSocket: () => ({
    on: (
      event: string,
      handler: (payload: Record<string, unknown>) => void,
    ) => {
      socketState.handlers.set(event, handler);
      socketState.on(event, handler);
    },
  }),
}));

interface Owner {
  id: number;
  pinned: boolean;
  lastSeenAt: string | null;
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system' | 'event';
  content: string;
  createdAt: string;
  event: AssistantMessageEvent | null;
}

function message(
  id: number,
  role: Message['role'],
  content: string,
  event: AssistantMessageEvent | null = null,
): Message {
  return {
    id,
    role,
    content,
    createdAt: `2026-08-20T10:00:0${id}Z`,
    event,
  };
}

describe('createChatStore final response without streaming', () => {
  beforeEach(() => {
    socketState.handlers.clear();
    socketState.on.mockClear();
  });

  it('shows the persisted reply and completes the pending turn without stream chunks', async () => {
    const userMessage = message(1, 'user', 'Question');
    const finalMessage = message(3, 'assistant', 'Loop answer');
    const runningTool = message(2, 'event', 'Searching', {
      kind: 'tool_executed',
      tool: { name: 'folder_search', status: 'running' },
    });
    const api = {
      list: vi
        .fn()
        .mockResolvedValue([{ id: 7, pinned: false, lastSeenAt: null }]),
      update: vi.fn(),
      remove: vi.fn(),
      getMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
      sendMessage: vi
        .fn()
        .mockResolvedValue({ userMessage, executionId: 'execution-1' }),
    };
    const store = createChatStore<Owner, Message, Partial<Owner>>({
      api,
      events: {
        toolEvent: 'tool-event',
        streamChunk: 'stream-chunk',
        response: 'response',
      },
      socketIdKey: 'ownerId',
      loadErrorMessage: 'Failed to load chat',
    });

    await store.load();
    await store.selectOwner(7);
    await store.sendMessage('Question');
    socketState.handlers.get('tool-event')?.({
      ownerId: 7,
      eventMessage: runningTool,
    });
    socketState.handlers.get('response')?.({
      ownerId: 7,
      message: finalMessage,
    });

    expect(store.isActivePending.value).toBe(false);
    expect(store.activeStreaming.value).toBe('');
    expect(store.activeMessages.value.map((item) => item.content)).toEqual([
      'Question',
      'Searching',
      'Loop answer',
    ]);
    expect(store.activeMessages.value[1].event.tool.status).toBe('done');
  });

  it('completes the pending turn when the persisted response contains an error', async () => {
    const userMessage = message(1, 'user', 'Question');
    const failedMessage = {
      ...message(2, 'assistant', ''),
      error: 'Model returned an empty response',
    };
    const api = {
      list: vi
        .fn()
        .mockResolvedValue([{ id: 7, pinned: false, lastSeenAt: null }]),
      update: vi.fn(),
      remove: vi.fn(),
      getMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
      sendMessage: vi
        .fn()
        .mockResolvedValue({ userMessage, executionId: 'execution-1' }),
    };
    const store = createChatStore<Owner, Message, Partial<Owner>>({
      api,
      events: {
        toolEvent: 'tool-event',
        streamChunk: 'stream-chunk',
        response: 'response',
      },
      socketIdKey: 'ownerId',
      loadErrorMessage: 'Failed to load chat',
    });

    await store.load();
    await store.selectOwner(7);
    await store.sendMessage('Question');
    socketState.handlers.get('response')?.({
      ownerId: 7,
      message: failedMessage,
    });

    expect(store.isActivePending.value).toBe(false);
    expect(store.activeMessages.value).toEqual([userMessage, failedMessage]);
  });

  it('shows a deterministic partial once and completes the pending turn', async () => {
    const userMessage = message(1, 'user', 'Question');
    const partialMessage = {
      ...message(2, 'assistant', 'Completed work: 3 matching documents found'),
      completionKind: 'partial',
      completionSource: 'runtime_template',
    } as Message;
    const api = {
      list: vi
        .fn()
        .mockResolvedValue([{ id: 7, pinned: false, lastSeenAt: null }]),
      update: vi.fn(),
      remove: vi.fn(),
      getMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
      sendMessage: vi
        .fn()
        .mockResolvedValue({ userMessage, executionId: 'execution-1' }),
    };
    const store = createChatStore<Owner, Message, Partial<Owner>>({
      api,
      events: {
        toolEvent: 'tool-event',
        streamChunk: 'stream-chunk',
        response: 'response',
      },
      socketIdKey: 'ownerId',
      loadErrorMessage: 'Failed to load chat',
    });

    await store.load();
    await store.selectOwner(7);
    await store.sendMessage('Question');
    const response = { ownerId: 7, message: partialMessage };
    socketState.handlers.get('response')?.(response);
    socketState.handlers.get('response')?.(response);

    expect(store.isActivePending.value).toBe(false);
    expect(store.error.value).toBeNull();
    expect(store.activeMessages.value).toEqual([userMessage, partialMessage]);
  });

  it('does not render internal loop-guard events as messages or tool cards', async () => {
    const api = {
      list: vi
        .fn()
        .mockResolvedValue([{ id: 7, pinned: false, lastSeenAt: null }]),
      update: vi.fn(),
      remove: vi.fn(),
      getMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
      sendMessage: vi.fn(),
    };
    const store = createChatStore<Owner, Message, Partial<Owner>>({
      api,
      events: {
        toolEvent: 'tool-event',
        streamChunk: 'stream-chunk',
        response: 'response',
      },
      socketIdKey: 'ownerId',
      loadErrorMessage: 'Failed to load chat',
    });

    await store.load();
    await store.selectOwner(7);
    socketState.handlers.get('tool-event')?.({
      ownerId: 7,
      eventType: 'progress.reported',
      payload: {
        kind: 'loop_guard_triggered',
        loopGuardSignal: {
          guardKind: 'immediate_exact_tool_repeat',
          action: 'warn',
        },
      },
    });
    socketState.handlers.get('tool-event')?.({
      ownerId: 7,
      eventType: 'progress.reported',
      payload: {
        kind: 'loop_guard_triggered',
        loopGuardSignal: {
          guardKind: 'immediate_exact_tool_repeat',
          action: 'block',
        },
      },
    });

    expect(store.activeMessages.value).toEqual([]);
  });
});
