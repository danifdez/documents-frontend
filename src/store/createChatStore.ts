import { ref, computed } from 'vue';
import type { Ref } from 'vue';
import { getSocket } from '../services/notifications/notification';
import {
    FOLDER_MUTATING_TOOLS,
    coerceRunningToolsToDone,
    mergeToolEventMessage,
    withToolStatus,
    withEntityDeleted,
} from '../composables/chatMessageEvents';
import type { ChatEventMessage } from '../composables/chatMessageEvents';

const MESSAGE_PAGE_SIZE = 50;

/** Conversation owner (an agent or an assistant). */
export interface ChatOwner {
    id: number;
    pinned: boolean;
    lastSeenAt: string | null;
}

export interface ChatStoreMessage extends ChatEventMessage {
    createdAt: string;
}

export interface ChatStoreApi<TOwner, TMsg, TUpdate> {
    list(): Promise<TOwner[]>;
    update(id: number, payload: TUpdate): Promise<TOwner>;
    remove(id: number): Promise<void>;
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
    /** Extra reaction to a live tool event, after the shared folder-version bump. */
    onToolEvent?: (
        toolName: string | undefined,
        toolStatus: string | undefined,
        ownerId: number,
    ) => void;
    /**
     * Collect extra messages carried by the final response event (e.g. memory
     * cards) that are not already in `existing`. They are appended before the
     * reply itself.
     */
    collectResponseEventMessages?: (event: Record<string, any>, existing: TMsg[]) => TMsg[];
    /** Runs after a successful list() load, with the socket already attached. */
    afterLoad?: (ctx: ChatStoreContext<TOwner>) => void;
    /** Extra reaction after a pending-confirmation card is resolved locally. */
    onToolStatusResolved?: (status: 'done' | 'cancelled', toolKind: string | undefined) => void;
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
    events: { toolEvent: string; streamChunk: string; response: string };
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
 * message history with backwards paging, live socket updates (tool cards,
 * token stream, final reply) and tool-card status bookkeeping. Everything
 * the two domains genuinely differ on comes in through the options/hooks;
 * each store re-exports these members under its own public names.
 */
export function createChatStore<
    TOwner extends ChatOwner,
    TMsg extends ChatStoreMessage,
    TUpdate,
>(options: ChatStoreOptions<TOwner, TMsg, TUpdate>) {
    const { api, events, socketIdKey, loadErrorMessage } = options;
    const hooks = options.hooks ?? {};

    const owners = ref([]) as Ref<TOwner[]>;
    const activeId = ref<number | null>(null);
    const messagesByOwner = ref({}) as Ref<Record<number, TMsg[]>>;
    // Whether older history remains beyond what's loaded, per owner.
    const hasMoreByOwner = ref<Record<number, boolean>>({});
    const loadingOlderByOwner = ref<Record<number, boolean>>({});
    const pendingByOwner = ref<Record<number, boolean>>({});
    // Partial reply being streamed in for an owner. Cleared when the final
    // response event arrives. Keyed by owner id so concurrent requests on
    // different owners don't trample each other.
    const streamingByOwner = ref<Record<number, string>>({});
    // True between "model finished generating" and "final response persisted".
    // Lets the UI stop the live caret as soon as the LLM is done, even if the
    // backend still has work to do before it can emit the response event.
    const streamDoneByOwner = ref<Record<number, boolean>>({});
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);
    // Bumped whenever a chat tool mutates the owner's working folder. The
    // files panel watches this counter so it refetches after folder_write /
    // folder_delete / folder_overwrite without a full reload.
    const folderFilesVersionByOwner = ref<Record<number, number>>({});
    let socketAttached = false;

    const ctx: ChatStoreContext<TOwner> = { owners, activeId };

    function bumpFolderFilesVersion(ownerId: number) {
        const prev = folderFilesVersionByOwner.value[ownerId] ?? 0;
        folderFilesVersionByOwner.value = {
            ...folderFilesVersionByOwner.value,
            [ownerId]: prev + 1,
        };
    }

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

    const activeStreaming = computed<string>(() => {
        if (activeId.value == null) return '';
        return streamingByOwner.value[activeId.value] ?? '';
    });

    const activeStreamDone = computed<boolean>(() => {
        if (activeId.value == null) return false;
        return !!streamDoneByOwner.value[activeId.value];
    });

    function _attachSocket() {
        if (socketAttached) return;
        hooks.onSocketAttached?.();
        const socket = getSocket();

        // Live tool event (e.g. "🔍 Searching…") pushed by the worker BEFORE
        // the reply arrives. The backend has already persisted the event
        // message — we just append it to the chat so the user sees activity
        // immediately instead of staring at "Thinking…".
        socket.on(events.toolEvent, (event: Record<string, any>) => {
            const ownerId: number | undefined = event?.[socketIdKey];
            if (!ownerId || !event?.eventMessage) return;
            const arr = messagesByOwner.value[ownerId] ?? [];
            const incoming = event.eventMessage as TMsg;
            // Tell the files panel (if open) that the working folder may have
            // changed. We bump on `done` only — `running` /
            // `pending_confirmation` haven't touched disk yet.
            const toolName = incoming.event?.kind === 'tool_executed'
                ? incoming.event.tool?.name
                : undefined;
            const toolStatus = incoming.event?.kind === 'tool_executed'
                ? incoming.event.tool?.status
                : undefined;
            if (toolName && FOLDER_MUTATING_TOOLS.has(toolName) && toolStatus === 'done') {
                bumpFolderFilesVersion(ownerId);
            }
            hooks.onToolEvent?.(toolName, toolStatus, ownerId);
            messagesByOwner.value = {
                ...messagesByOwner.value,
                [ownerId]: mergeToolEventMessage(arr, incoming),
            };
        });

        // Live token stream while the worker is generating. We just accumulate
        // raw chunks; the chat component renders the running text as a typing
        // bubble. The final, persisted message arrives via the response event
        // below and replaces this temporary buffer.
        socket.on(events.streamChunk, (event: Record<string, any>) => {
            const ownerId: number | undefined = event?.[socketIdKey];
            if (!ownerId) return;
            if (typeof event.chunk === 'string' && event.chunk.length > 0) {
                const prev = streamingByOwner.value[ownerId] ?? '';
                streamingByOwner.value = {
                    ...streamingByOwner.value,
                    [ownerId]: prev + event.chunk,
                };
            }
            if (event.done) {
                streamDoneByOwner.value = {
                    ...streamDoneByOwner.value,
                    [ownerId]: true,
                };
            }
        });

        socket.on(events.response, (event: Record<string, any>) => {
            const ownerId: number | undefined = event?.[socketIdKey];
            const message = event?.message as TMsg | undefined;
            if (!ownerId || !message) return;
            let arr = messagesByOwner.value[ownerId] ?? [];

            // Defensive cleanup: if any tool cards were left as `running` (a
            // `done` event never matched them — network reorder, mismatched
            // args, etc.), force them to `done` now that the final reply has
            // been produced. The model can't still be searching.
            const coerced = coerceRunningToolsToDone(arr);
            arr = coerced.messages;
            const mutated = coerced.mutated;

            // Append extra event messages (cards) first, then the reply.
            const toAppend: TMsg[] = hooks.collectResponseEventMessages?.(event, arr) ?? [];
            if (!arr.some((m) => m.id === message.id)) {
                toAppend.push(message);
            }
            if (toAppend.length > 0 || mutated) {
                messagesByOwner.value = {
                    ...messagesByOwner.value,
                    [ownerId]: [...arr, ...toAppend],
                };
            }
            pendingByOwner.value = {
                ...pendingByOwner.value,
                [ownerId]: false,
            };
            // Wipe the live stream buffer — the persisted message has taken
            // its place. Done as a fresh object so consumers using
            // `activeStreaming` re-evaluate cleanly.
            if (streamingByOwner.value[ownerId]) {
                const next = { ...streamingByOwner.value };
                delete next[ownerId];
                streamingByOwner.value = next;
            }
            if (streamDoneByOwner.value[ownerId]) {
                const next = { ...streamDoneByOwner.value };
                delete next[ownerId];
                streamDoneByOwner.value = next;
            }
            // Bump lastSeenAt locally so the sidebar reorders without a refresh.
            const idx = owners.value.findIndex((a) => a.id === ownerId);
            if (idx >= 0) {
                owners.value[idx] = {
                    ...owners.value[idx],
                    lastSeenAt: message.createdAt,
                } as TOwner;
            }
        });
        socketAttached = true;
    }

    async function load(force = false) {
        if (loaded.value && !force) return;
        loading.value = true;
        error.value = null;
        try {
            owners.value = await api.list();
            loaded.value = true;
            _attachSocket();
            hooks.afterLoad?.(ctx);
        } catch (e: any) {
            error.value = e?.message || loadErrorMessage;
        } finally {
            loading.value = false;
        }
    }

    /**
     * Update the local copy of a `tool_executed` event after the user resolves
     * a pending-confirmation card (Confirm/Cancel). The backend has already
     * been patched; this only mirrors the change in the in-memory message list
     * so the card re-renders without a fresh fetch.
     */
    function updateEventToolStatus(
        messageId: number,
        status: 'done' | 'cancelled',
        summary?: string,
    ): void {
        const aid = activeId.value;
        if (aid == null) return;
        const arr = messagesByOwner.value[aid];
        if (!arr) return;
        const idx = arr.findIndex((m) => m.id === messageId);
        if (idx < 0) return;
        const msg = arr[idx];
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool) return;
        const next = [...arr];
        const toolName = msg.event.tool.name;
        const toolKind = (msg.event.tool as any).kind as string | undefined;
        next[idx] = withToolStatus(msg, status, summary);
        messagesByOwner.value = { ...messagesByOwner.value, [aid]: next };
        // A confirmed folder action mutates disk; tell the panel to refetch.
        if (status === 'done' && (
            FOLDER_MUTATING_TOOLS.has(toolName)
            || (toolKind && FOLDER_MUTATING_TOOLS.has(toolKind))
        )) {
            bumpFolderFilesVersion(aid);
        }
        hooks.onToolStatusResolved?.(status, toolKind);
    }

    function folderFilesVersionFor(ownerId: number): number {
        return folderFilesVersionByOwner.value[ownerId] ?? 0;
    }

    /**
     * Mark the entity attached to a `tool_executed` event card as deleted —
     * the backend has already removed the underlying note/task and this
     * flips the card's UI from a Delete button to a "Deleted" badge.
     */
    function markEventEntityDeleted(messageId: number): void {
        const aid = activeId.value;
        if (aid == null) return;
        const arr = messagesByOwner.value[aid];
        if (!arr) return;
        const idx = arr.findIndex((m) => m.id === messageId);
        if (idx < 0) return;
        const msg = arr[idx];
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool?.entity) return;
        const next = [...arr];
        next[idx] = withEntityDeleted(msg);
        messagesByOwner.value = { ...messagesByOwner.value, [aid]: next };
    }

    async function selectOwner(id: number) {
        activeId.value = id;
        if (!messagesByOwner.value[id]) {
            try {
                const { messages, hasMore } = await api.getMessages(id, { limit: MESSAGE_PAGE_SIZE });
                // Any tool card persisted as `running` is necessarily stale —
                // the worker process that emitted it is long gone. Coerce to
                // `done` so the spinner doesn't hang forever on reload.
                const sanitized = coerceRunningToolsToDone(messages).messages;
                messagesByOwner.value = { ...messagesByOwner.value, [id]: sanitized };
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
            const older = coerceRunningToolsToDone(messages).messages;
            const seen = new Set(current.map((m) => m.id));
            const fresh = older.filter((m) => !seen.has(m.id));
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
            const { userMessage } = await api.sendMessage(id, content);
            const arr = messagesByOwner.value[id] ?? [];
            messagesByOwner.value = {
                ...messagesByOwner.value,
                [id]: [...arr, userMessage],
            };
            pendingByOwner.value = { ...pendingByOwner.value, [id]: true };
            // Clear any leftover stream state from a previous turn so the
            // caret + buffer start fresh.
            if (streamingByOwner.value[id] || streamDoneByOwner.value[id]) {
                const s = { ...streamingByOwner.value }; delete s[id];
                streamingByOwner.value = s;
                const d = { ...streamDoneByOwner.value }; delete d[id];
                streamDoneByOwner.value = d;
            }
        } catch (e: any) {
            error.value = e?.message || 'Failed to send message';
        }
    }

    async function updateOwner(id: number, payload: TUpdate) {
        const updated = await api.update(id, payload);
        const idx = owners.value.findIndex((a) => a.id === id);
        if (idx >= 0) owners.value[idx] = updated;
        return updated;
    }

    async function deleteOwner(id: number) {
        await api.remove(id);
        owners.value = owners.value.filter((a) => a.id !== id);
        delete messagesByOwner.value[id];
        delete pendingByOwner.value[id];
        if (activeId.value === id) {
            activeId.value = hooks.nextActiveIdAfterDelete?.(ctx) ?? null;
        }
    }

    async function togglePin(id: number) {
        const owner = owners.value.find((x) => x.id === id);
        if (!owner) return;
        if (hooks.canTogglePin && !hooks.canTogglePin(owner)) return;
        await updateOwner(id, { pinned: !owner.pinned } as TUpdate);
    }

    return {
        owners,
        activeId,
        messagesByOwner,
        pendingByOwner,
        loading,
        loaded,
        error,
        sortedOwners,
        activeOwner,
        activeMessages,
        activeHasMore,
        activeLoadingOlder,
        isActivePending,
        activeStreaming,
        activeStreamDone,
        load,
        selectOwner,
        loadOlder,
        sendMessage,
        updateOwner,
        deleteOwner,
        togglePin,
        markEventEntityDeleted,
        updateEventToolStatus,
        folderFilesVersionFor,
        bumpFolderFilesVersion,
    };
}
