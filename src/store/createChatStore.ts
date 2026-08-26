import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { subscribeExecutionPublication } from '../services/notifications/executionPublication';
import { useExecutionConfirmations } from '../services/executions/useExecutionConfirmations';
import { useExecutionCancellation } from '../services/executions/useExecutionCancellation';
import type { ExecutionProgress } from '../services/executions/useExecutionProgress';
import { useExecutionProgress } from '../services/executions/useExecutionProgress';
import type { AssistantMessageEvent } from '../types/Assistant';
import type {
    ExecutionConfirmation,
    ExecutionConfirmationEnvelope,
} from '../types/ExecutionConfirmation';

const MESSAGE_PAGE_SIZE = 50;

/** Conversation owner (an agent or an assistant). */
export interface ChatOwner {
    id: number;
    pinned?: boolean;
    lastSeenAt: string | null;
}

export interface ChatStoreMessage {
    id: number;
    role: 'user' | 'assistant' | 'system' | 'event';
    event: AssistantMessageEvent | null;
    createdAt: string;
}

export interface ChatStoreApi<TOwner, TMsg, TUpdate> {
    list(): Promise<TOwner[]>;
    update?(id: number, payload: TUpdate): Promise<TOwner>;
    remove?(id: number): Promise<void>;
    getMessages(
        id: number,
        opts?: { limit?: number; before?: number },
    ): Promise<{ messages: TMsg[]; hasMore: boolean }>;
    sendMessage(id: number, content: string): Promise<{ userMessage: TMsg; executionId: string }>;
}

export interface ChatStoreContext<TOwner> {
    owners: Ref<TOwner[]>;
    activeId: Ref<number | null>;
}

export interface ChatStoreHooks<TOwner extends ChatOwner, TMsg extends ChatStoreMessage> {
    /** Runs once, right before the socket listeners are registered. */
    onSocketAttached?: () => void;
    /**
     * Collect extra messages carried by the final response event (e.g. memory
     * cards) that are not already in `existing`. They are appended before the
     * reply itself.
     */
    collectResponseEventMessages?: (event: Record<string, any>, existing: TMsg[]) => TMsg[];
    /** Runs after a successful list() load, with the socket already attached. */
    afterLoad?: (ctx: ChatStoreContext<TOwner>) => void;
    /** Owners for which the pin toggle is a no-op (e.g. system assistants). */
    canTogglePin?: (owner: TOwner) => boolean;
    /** Which owner becomes active after the active one is deleted. */
    nextActiveIdAfterDelete?: (ctx: ChatStoreContext<TOwner>) => number | null;
}

export interface ChatStoreOptions<
    TOwner extends ChatOwner,
    TMsg extends ChatStoreMessage,
    TUpdate,
> {
    api: ChatStoreApi<TOwner, TMsg, TUpdate>;
    /** Socket event names pushed by the backend for this chat family. */
    responseEvent: string;
    taskType: 'assistant-chat' | 'agent-chat';
    /** Payload property carrying the owner id (`agentId` / `assistantId`). */
    socketIdKey: string;
    /** Error message shown when the initial list() fails. */
    loadErrorMessage: string;
    /**
     * Domain ordering for `sortedOwners`. Receives a fresh copy of the owner
     * array (safe to sort in place). Defaults to arrival order — i.e. the
     * order the backend returned.
     */
    sortOwners?: (owners: TOwner[]) => TOwner[];
    hooks?: ChatStoreHooks<TOwner, TMsg>;
}

/**
 * Shared core of the agent/assistant chat stores: owner list, per-owner
 * message history with backwards paging and durable final reply publications. Everything
 * the two domains genuinely differ on comes in through the options/hooks;
 * each store re-exports these members under its own public names.
 */
export function createChatStore<
    TOwner extends ChatOwner,
    TMsg extends ChatStoreMessage,
    TUpdate,
>(options: ChatStoreOptions<TOwner, TMsg, TUpdate>) {
    const { api, responseEvent, socketIdKey, loadErrorMessage, taskType } = options;
    const hooks = options.hooks ?? {};
    const confirmationsApi = useExecutionConfirmations();
    const cancellationApi = useExecutionCancellation();
    const progressApi = useExecutionProgress();

    const owners = ref([]) as Ref<TOwner[]>;
    const activeId = ref<number | null>(null);
    const messagesByOwner = ref({}) as Ref<Record<number, TMsg[]>>;
    // Whether older history remains beyond what's loaded, per owner.
    const hasMoreByOwner = ref<Record<number, boolean>>({});
    const loadingOlderByOwner = ref<Record<number, boolean>>({});
    const pendingByOwner = ref<Record<number, boolean>>({});
    const pendingExecutionByOwner = ref<Record<number, string>>({});
    const executionProgressByOwner = ref<Record<number, ExecutionProgress>>({});
    const confirmationsByOwner = ref<Record<number, ExecutionConfirmation[]>>({});
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);
    let socketAttached = false;
    const progressTimers = new Map<number, ReturnType<typeof setTimeout>>();

    const ctx: ChatStoreContext<TOwner> = { owners, activeId };

    const sortedOwners = computed<TOwner[]>(() => {
        const list = [...owners.value];
        return options.sortOwners ? options.sortOwners(list) : list;
    });

    const activeOwner = computed<TOwner | null>(() => {
        if (activeId.value == null) return null;
        return owners.value.find((a) => a.id === activeId.value) ?? null;
    });

    const activeMessages = computed<TMsg[]>(() => {
        if (activeId.value == null) return [];
        return messagesByOwner.value[activeId.value] ?? [];
    });

    const activeHasMore = computed<boolean>(() => {
        if (activeId.value == null) return false;
        return !!hasMoreByOwner.value[activeId.value];
    });

    const activeLoadingOlder = computed<boolean>(() => {
        if (activeId.value == null) return false;
        return !!loadingOlderByOwner.value[activeId.value];
    });

    const isActivePending = computed(() => {
        if (activeId.value == null) return false;
        return !!pendingByOwner.value[activeId.value];
    });

    const activeConfirmations = computed<ExecutionConfirmation[]>(() => {
        if (activeId.value == null) return [];
        return confirmationsByOwner.value[activeId.value] ?? [];
    });

    const activeExecutionProgress = computed<ExecutionProgress | null>(() => {
        if (activeId.value == null) return null;
        return executionProgressByOwner.value[activeId.value] ?? null;
    });

    function stopProgressPolling(ownerId: number): void {
        const timer = progressTimers.get(ownerId);
        if (timer) clearTimeout(timer);
        progressTimers.delete(ownerId);
    }

    async function pollExecutionProgress(
        ownerId: number,
        executionId: string,
    ): Promise<void> {
        if (pendingExecutionByOwner.value[ownerId] !== executionId) return;
        try {
            const progress = await progressApi.get(executionId);
            if (pendingExecutionByOwner.value[ownerId] === executionId) {
                executionProgressByOwner.value = {
                    ...executionProgressByOwner.value,
                    [ownerId]: progress,
                };
            }
        } catch {
            // The final socket publication remains authoritative if polling is unavailable.
        }
        if (pendingExecutionByOwner.value[ownerId] === executionId) {
            stopProgressPolling(ownerId);
            progressTimers.set(
                ownerId,
                setTimeout(() => void pollExecutionProgress(ownerId, executionId), 1_000),
            );
        }
    }

    function upsertConfirmation(envelope: ExecutionConfirmationEnvelope): void {
        if (envelope.taskType !== taskType || envelope.ownerId == null) return;
        const current = confirmationsByOwner.value[envelope.ownerId] ?? [];
        const confirmation = envelope.confirmation;
        const next = current.filter(
            (item) => item.confirmationId !== confirmation.confirmationId,
        );
        if (confirmation.status === 'pending') next.push(confirmation);
        confirmationsByOwner.value = {
            ...confirmationsByOwner.value,
            [envelope.ownerId]: next,
        };
    }

    function clearPending(ownerId: number): void {
        stopProgressPolling(ownerId);
        pendingByOwner.value = {
            ...pendingByOwner.value,
            [ownerId]: false,
        };
        const executions = { ...pendingExecutionByOwner.value };
        delete executions[ownerId];
        pendingExecutionByOwner.value = executions;
        const progress = { ...executionProgressByOwner.value };
        delete progress[ownerId];
        executionProgressByOwner.value = progress;
    }

    function _attachSocket() {
        if (socketAttached) return;
        hooks.onSocketAttached?.();
        subscribeExecutionPublication(responseEvent, (event: Record<string, any>) => {
            const ownerId: number | undefined = event?.[socketIdKey];
            const message = event?.message as TMsg | undefined;
            if (!ownerId || !message) return;
            const arr = messagesByOwner.value[ownerId] ?? [];

            // Append extra event messages (cards) first, then the reply.
            const toAppend: TMsg[] = hooks.collectResponseEventMessages?.(event, arr) ?? [];
            if (!arr.some((m) => m.id === message.id)) {
                toAppend.push(message);
            }
            if (toAppend.length > 0) {
                messagesByOwner.value = {
                    ...messagesByOwner.value,
                    [ownerId]: [...arr, ...toAppend],
                };
            }
            clearPending(ownerId);
            // Bump lastSeenAt locally so the sidebar reorders without a refresh.
            const idx = owners.value.findIndex((a) => a.id === ownerId);
            if (idx >= 0) {
                owners.value[idx] = {
                    ...owners.value[idx],
                    lastSeenAt: message.createdAt,
                } as TOwner;
            }
        });
        subscribeExecutionPublication(
            'executionConfirmationRequested',
            (event: Record<string, any>) => {
                upsertConfirmation(event as ExecutionConfirmationEnvelope);
            },
        );
        subscribeExecutionPublication(
            'executionConfirmationDecided',
            (event: Record<string, any>) => {
                upsertConfirmation(event as ExecutionConfirmationEnvelope);
            },
        );
        subscribeExecutionPublication(
            'executionCancellationRequested',
            (event: Record<string, unknown>) => {
                const ownerId = event.ownerId;
                if (event.taskType !== taskType || typeof ownerId !== 'number') return;
                clearPending(ownerId);
                confirmationsByOwner.value = {
                    ...confirmationsByOwner.value,
                    [ownerId]: [],
                };
            },
        );
        socketAttached = true;
    }

    async function load(force = false) {
        if (loaded.value && !force) return;
        loading.value = true;
        error.value = null;
        try {
            owners.value = await api.list();
            const confirmations = await confirmationsApi.listPending();
            confirmations
                .filter((item) => item.taskType === taskType)
                .forEach(upsertConfirmation);
            loaded.value = true;
            _attachSocket();
            hooks.afterLoad?.(ctx);
        } catch (e: any) {
            error.value = e?.message || loadErrorMessage;
        } finally {
            loading.value = false;
        }
    }

    async function selectOwner(id: number) {
        activeId.value = id;
        if (!messagesByOwner.value[id]) {
            try {
                const { messages, hasMore } = await api.getMessages(id, { limit: MESSAGE_PAGE_SIZE });
                messagesByOwner.value = { ...messagesByOwner.value, [id]: messages };
                hasMoreByOwner.value = { ...hasMoreByOwner.value, [id]: hasMore };
            } catch (e: any) {
                error.value = e?.message || 'Failed to load messages';
            }
        }
    }

    // Page backwards: fetch the slice immediately older than the oldest message
    // currently in memory and prepend it (deduped by id). The component is
    // responsible for preserving scroll position around this call.
    async function loadOlder(id: number) {
        const current = messagesByOwner.value[id];
        if (!current || current.length === 0) return;
        if (loadingOlderByOwner.value[id]) return;
        if (hasMoreByOwner.value[id] === false) return;
        const before = current[0].id;
        loadingOlderByOwner.value = { ...loadingOlderByOwner.value, [id]: true };
        try {
            const { messages, hasMore } = await api.getMessages(id, { limit: MESSAGE_PAGE_SIZE, before });
            const seen = new Set(current.map((m) => m.id));
            const fresh = messages.filter((m) => !seen.has(m.id));
            messagesByOwner.value = {
                ...messagesByOwner.value,
                [id]: [...fresh, ...current],
            };
            hasMoreByOwner.value = { ...hasMoreByOwner.value, [id]: hasMore };
        } catch (e: any) {
            error.value = e?.message || 'Failed to load older messages';
        } finally {
            loadingOlderByOwner.value = { ...loadingOlderByOwner.value, [id]: false };
        }
    }

    async function sendMessage(content: string) {
        if (activeId.value == null) return;
        const id = activeId.value;
        try {
            const { userMessage, executionId } = await api.sendMessage(id, content);
            const arr = messagesByOwner.value[id] ?? [];
            messagesByOwner.value = {
                ...messagesByOwner.value,
                [id]: [...arr, userMessage],
            };
            pendingByOwner.value = { ...pendingByOwner.value, [id]: true };
            pendingExecutionByOwner.value = {
                ...pendingExecutionByOwner.value,
                [id]: executionId,
            };
            void pollExecutionProgress(id, executionId);
        } catch (e: any) {
            error.value = e?.message || 'Failed to send message';
        }
    }

    async function cancelActiveExecution(): Promise<void> {
        if (activeId.value == null) return;
        const ownerId = activeId.value;
        const executionId = pendingExecutionByOwner.value[ownerId];
        if (!executionId) return;
        await cancellationApi.cancel(executionId);
        clearPending(ownerId);
        confirmationsByOwner.value = {
            ...confirmationsByOwner.value,
            [ownerId]: [],
        };
    }

    async function decideConfirmation(
        confirmationId: string,
        decision: 'approved' | 'denied',
    ): Promise<void> {
        await confirmationsApi.decide(confirmationId, decision);
        const next: Record<number, ExecutionConfirmation[]> = {};
        for (const [ownerId, confirmations] of Object.entries(confirmationsByOwner.value)) {
            next[Number(ownerId)] = confirmations.filter(
                (item) => item.confirmationId !== confirmationId,
            );
        }
        confirmationsByOwner.value = next;
    }

    async function updateOwner(id: number, payload: TUpdate) {
        if (!api.update) return null;
        const updated = await api.update(id, payload);
        const idx = owners.value.findIndex((a) => a.id === id);
        if (idx >= 0) owners.value[idx] = updated;
        return updated;
    }

    async function deleteOwner(id: number) {
        if (!api.remove) return;
        await api.remove(id);
        owners.value = owners.value.filter((a) => a.id !== id);
        delete messagesByOwner.value[id];
        delete pendingByOwner.value[id];
        stopProgressPolling(id);
        const progress = { ...executionProgressByOwner.value };
        delete progress[id];
        executionProgressByOwner.value = progress;
        if (activeId.value === id) {
            activeId.value = hooks.nextActiveIdAfterDelete?.(ctx) ?? null;
        }
    }

    async function togglePin(id: number) {
        const owner = owners.value.find((x) => x.id === id);
        if (!owner || typeof owner.pinned !== 'boolean') return;
        if (hooks.canTogglePin && !hooks.canTogglePin(owner)) return;
        if (!api.update) return;
        await updateOwner(id, { pinned: !owner.pinned } as TUpdate);
    }

    return {
        owners,
        activeId,
        messagesByOwner,
        pendingByOwner,
        pendingExecutionByOwner,
        executionProgressByOwner,
        confirmationsByOwner,
        loading,
        loaded,
        error,
        sortedOwners,
        activeOwner,
        activeMessages,
        activeHasMore,
        activeLoadingOlder,
        isActivePending,
        activeConfirmations,
        activeExecutionProgress,
        load,
        selectOwner,
        loadOlder,
        sendMessage,
        cancelActiveExecution,
        decideConfirmation,
        updateOwner,
        deleteOwner,
        togglePin,
    };
}
