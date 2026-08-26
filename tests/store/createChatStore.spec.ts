import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatStore } from '../../src/store/createChatStore';
import type { AssistantMessageEvent } from '../../src/types/Assistant';

const socketState = vi.hoisted(() => ({
  handlers: new Map<string, (event: Record<string, unknown>) => void>(),
  on: vi.fn(),
}));

const confirmationState = vi.hoisted(() => ({
  listPending: vi.fn().mockResolvedValue([]),
  decide: vi.fn(),
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

vi.mock('@/services/notifications/executionPublication', () => ({
  subscribeExecutionPublication: (
    event: string,
    handler: (payload: Record<string, unknown>) => void,
  ) => {
    socketState.handlers.set(event, handler);
    return () => socketState.handlers.delete(event);
  },
}));

vi.mock('@/services/executions/useExecutionConfirmations', () => ({
  useExecutionConfirmations: () => confirmationState,
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

describe('createChatStore durable final response', () => {
  beforeEach(() => {
    socketState.handlers.clear();
    socketState.on.mockClear();
    confirmationState.listPending.mockReset().mockResolvedValue([]);
    confirmationState.decide.mockReset().mockResolvedValue({});
  });

  it('shows the persisted reply and completes the pending turn', async () => {
    const userMessage = message(1, 'user', 'Question');
    const finalMessage = message(3, 'assistant', 'Loop answer');
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
      responseEvent: 'response',
      taskType: 'assistant-chat',
      socketIdKey: 'ownerId',
      loadErrorMessage: 'Failed to load chat',
    });

    await store.load();
    await store.selectOwner(7);
    await store.sendMessage('Question');
    socketState.handlers.get('response')?.({
      ownerId: 7,
      message: finalMessage,
    });

    expect(store.isActivePending.value).toBe(false);
    expect(store.activeMessages.value.map((item) => item.content)).toEqual([
      'Question',
      'Loop answer',
    ]);
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
      responseEvent: 'response',
      taskType: 'assistant-chat',
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
      responseEvent: 'response',
      taskType: 'assistant-chat',
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

  it('projects and decides durable confirmations for the active chat family', async () => {
    const api = {
      list: vi
        .fn()
        .mockResolvedValue([{ id: 7, pinned: false, lastSeenAt: null }]),
      update: vi.fn(),
      remove: vi.fn(),
      getMessages: vi.fn().mockResolvedValue({ messages: [], hasMore: false }),
      sendMessage: vi.fn(),
    };
    const confirmation = {
      schemaVersion: 'confirmation/1' as const,
      confirmationId: 'confirmation-1',
      executionId: 'execution-1',
      operationId: 'operation-1',
      toolCallId: 'tool-call-1',
      planHash: `sha256:${'a'.repeat(64)}`,
      toolName: 'user_tasks.create',
      reason: 'Local mutation',
      prompt: 'Create the task?',
      scope: 'once' as const,
      resources: [],
      effects: [],
      status: 'pending' as const,
      expiresAt: null,
      decidedAt: null,
    };
    confirmationState.listPending.mockResolvedValue([
      { confirmation, ownerId: 7, taskType: 'assistant-chat' },
      { confirmation, ownerId: 7, taskType: 'agent-chat' },
    ]);
    const store = createChatStore<Owner, Message, Partial<Owner>>({
      api,
      responseEvent: 'response',
      taskType: 'assistant-chat',
      socketIdKey: 'ownerId',
      loadErrorMessage: 'Failed to load chat',
    });

    await store.load();
    await store.selectOwner(7);

    expect(store.activeConfirmations.value).toEqual([confirmation]);
    socketState.handlers.get('executionConfirmationDecided')?.({
      confirmation: { ...confirmation, status: 'denied' },
      ownerId: 7,
      taskType: 'assistant-chat',
    });
    expect(store.activeConfirmations.value).toEqual([]);

    socketState.handlers.get('executionConfirmationRequested')?.({
      confirmation,
      ownerId: 7,
      taskType: 'assistant-chat',
    });
    await store.decideConfirmation('confirmation-1', 'approved');

    expect(confirmationState.decide).toHaveBeenCalledWith(
      'confirmation-1',
      'approved',
    );
    expect(store.activeConfirmations.value).toEqual([]);
  });

});
