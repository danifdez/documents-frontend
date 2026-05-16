import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    Assistant,
    AssistantMessage,
    CreateAssistantPayload,
    UpdateAssistantPayload,
    AssistantResponseEvent,
} from '../types/Assistant';
import { useAssistants } from '../services/assistants/useAssistants';
import { useAssistantMemoryStore } from './assistantMemoryStore';
import { getSocket } from '../services/notifications/notification';

export const useAssistantStore = defineStore('assistant', () => {
    const api = useAssistants();

    const assistants = ref<Assistant[]>([]);
    const activeId = ref<number | null>(null);
    const messagesByAssistant = ref<Record<number, AssistantMessage[]>>({});
    const pendingByAssistant = ref<Record<number, boolean>>({});
    // Partial reply being streamed in for an assistant. Cleared when the
    // final `assistantResponse` arrives. Keyed by assistantId so concurrent
    // requests on different assistants don't trample each other.
    const streamingByAssistant = ref<Record<number, string>>({});
    // True between "model finished generating" and "final response persisted".
    // Lets the UI stop the live caret as soon as the LLM is done, even if the
    // backend is still extracting memory before it can emit assistantResponse.
    const streamDoneByAssistant = ref<Record<number, boolean>>({});
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);
    let socketAttached = false;

    const sortedAssistants = computed<Assistant[]>(() => {
        const list = [...assistants.value];
        return list.sort((a, b) => {
            if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const lsA = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const lsB = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
            if (lsA !== lsB) return lsB - lsA;
            return a.id - b.id;
        });
    });

    const activeAssistant = computed<Assistant | null>(() => {
        if (activeId.value == null) return null;
        return assistants.value.find((a) => a.id === activeId.value) ?? null;
    });

    const activeMessages = computed<AssistantMessage[]>(() => {
        if (activeId.value == null) return [];
        return messagesByAssistant.value[activeId.value] ?? [];
    });

    const isActivePending = computed(() => {
        if (activeId.value == null) return false;
        return !!pendingByAssistant.value[activeId.value];
    });

    const activeStreaming = computed<string>(() => {
        if (activeId.value == null) return '';
        return streamingByAssistant.value[activeId.value] ?? '';
    });

    const activeStreamDone = computed<boolean>(() => {
        if (activeId.value == null) return false;
        return !!streamDoneByAssistant.value[activeId.value];
    });

    function _attachSocket() {
        if (socketAttached) return;
        const memoryStore = useAssistantMemoryStore();
        const socket = getSocket();

        // Live tool event (e.g. "🔍 Searching…") pushed by the worker BEFORE
        // the reply arrives. The backend has already persisted the event
        // message — we just append it to the chat so the user sees activity
        // immediately instead of staring at "Thinking…".
        socket.on('assistantToolEvent', (event: { assistantId: number; eventMessage: AssistantMessage }) => {
            if (!event?.assistantId || !event?.eventMessage) return;
            const arr = messagesByAssistant.value[event.assistantId] ?? [];
            const incoming = event.eventMessage;
            const existingIdx = arr.findIndex((m) => m.id === incoming.id);
            if (existingIdx >= 0) {
                // Update in place — `running` → `done` transitions on the same id.
                const next = [...arr];
                next[existingIdx] = incoming;
                messagesByAssistant.value = {
                    ...messagesByAssistant.value,
                    [event.assistantId]: next,
                };
                return;
            }
            // Look for any earlier `running` card we can replace. Match on the
            // tool NAME only (not args) — assumes one tool runs at a time per
            // turn, which is the current MAX_TOOL_ROUNDS=3 sequential model.
            // Args match was too strict: tiny encoding/whitespace differences
            // between the running and done labels left orphan spinners.
            const runningIdx = arr.findIndex((m) =>
                m.role === 'event'
                && m.event?.kind === 'tool_executed'
                && m.event.tool?.name === incoming.event?.tool?.name
                && m.event.tool?.status === 'running',
            );
            if (runningIdx >= 0 && incoming.event?.tool?.status === 'done') {
                const next = [...arr];
                next[runningIdx] = incoming;
                messagesByAssistant.value = {
                    ...messagesByAssistant.value,
                    [event.assistantId]: next,
                };
                return;
            }
            messagesByAssistant.value = {
                ...messagesByAssistant.value,
                [event.assistantId]: [...arr, incoming],
            };
        });

        // Live token stream while the worker is generating. We just accumulate
        // raw chunks; the chat component renders the running text as a typing
        // bubble. The final, persisted message arrives via assistantResponse
        // below and replaces this temporary buffer.
        socket.on('assistantStreamChunk', (event: { assistantId: number; chunk: string; done?: boolean }) => {
            if (!event?.assistantId) return;
            if (typeof event.chunk === 'string' && event.chunk.length > 0) {
                const prev = streamingByAssistant.value[event.assistantId] ?? '';
                streamingByAssistant.value = {
                    ...streamingByAssistant.value,
                    [event.assistantId]: prev + event.chunk,
                };
            }
            if (event.done) {
                streamDoneByAssistant.value = {
                    ...streamDoneByAssistant.value,
                    [event.assistantId]: true,
                };
            }
        });

        socket.on('assistantResponse', (event: AssistantResponseEvent) => {
            if (!event?.assistantId || !event?.message) return;
            let arr = messagesByAssistant.value[event.assistantId] ?? [];

            // Defensive cleanup: if any tool cards were left as `running` (a
            // `done` event never matched them — network reorder, mismatched
            // args, etc.), force them to `done` now that the assistant has
            // produced its final reply. The model can't still be searching.
            let mutated = false;
            arr = arr.map((m) => {
                if (m.role === 'event' && m.event?.kind === 'tool_executed'
                    && m.event.tool?.status === 'running') {
                    mutated = true;
                    return {
                        ...m,
                        event: {
                            ...m.event,
                            tool: { ...m.event.tool, status: 'done' as const },
                        },
                    };
                }
                return m;
            });

            // Append event messages (cards) first, then the assistant reply.
            const toAppend: AssistantMessage[] = [];
            for (const ev of event.eventMessages ?? []) {
                if (ev && !arr.some((m) => m.id === ev.id)) {
                    toAppend.push(ev);
                    // Side-effect: keep the memory store in sync with what
                    // happened on the backend.
                    if (ev.event?.kind === 'memory_saved' && ev.event.entry) {
                        memoryStore.ingestSocketEntry(ev.event.entry);
                    } else if (ev.event?.kind === 'memory_forgotten' && ev.event.entry) {
                        memoryStore.dropSocketEntry(event.assistantId, ev.event.entry.id);
                    }
                }
            }
            if (!arr.some((m) => m.id === event.message.id)) {
                toAppend.push(event.message);
            }
            if (toAppend.length > 0 || mutated) {
                messagesByAssistant.value = {
                    ...messagesByAssistant.value,
                    [event.assistantId]: [...arr, ...toAppend],
                };
            }
            pendingByAssistant.value = {
                ...pendingByAssistant.value,
                [event.assistantId]: false,
            };
            // Wipe the live stream buffer — the persisted message has taken
            // its place. Done as a fresh object so consumers using `activeStreaming`
            // re-evaluate cleanly.
            if (streamingByAssistant.value[event.assistantId]) {
                const next = { ...streamingByAssistant.value };
                delete next[event.assistantId];
                streamingByAssistant.value = next;
            }
            if (streamDoneByAssistant.value[event.assistantId]) {
                const next = { ...streamDoneByAssistant.value };
                delete next[event.assistantId];
                streamDoneByAssistant.value = next;
            }
            // Bump lastSeenAt locally so the sidebar reorders without a refresh
            const idx = assistants.value.findIndex((a) => a.id === event.assistantId);
            if (idx >= 0) {
                assistants.value[idx] = {
                    ...assistants.value[idx],
                    lastSeenAt: event.message.createdAt,
                };
            }
        });
        socketAttached = true;
    }

    async function load(force = false) {
        if (loaded.value && !force) return;
        loading.value = true;
        error.value = null;
        try {
            assistants.value = await api.list();
            loaded.value = true;
            _attachSocket();
            if (activeId.value == null) {
                const personal = assistants.value.find((a) => a.isSystem);
                if (personal) activeId.value = personal.id;
            }
        } catch (e: any) {
            error.value = e?.message || 'Failed to load assistants';
        } finally {
            loading.value = false;
        }
    }

    /**
     * Mark the entity attached to a `tool_executed` event card as deleted —
     * the backend has already removed the underlying note/task and this
     * flips the card's UI from a Delete button to a "Deleted" badge.
     */
    function markEventEntityDeleted(messageId: number): void {
        const aid = activeId.value;
        if (aid == null) return;
        const arr = messagesByAssistant.value[aid];
        if (!arr) return;
        const idx = arr.findIndex((m) => m.id === messageId);
        if (idx < 0) return;
        const msg = arr[idx];
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool?.entity) return;
        const next = [...arr];
        next[idx] = {
            ...msg,
            event: {
                ...msg.event,
                tool: {
                    ...msg.event.tool,
                    entity: { ...msg.event.tool.entity, deleted: true },
                },
            },
        };
        messagesByAssistant.value = { ...messagesByAssistant.value, [aid]: next };
    }

    async function selectAssistant(id: number) {
        activeId.value = id;
        if (!messagesByAssistant.value[id]) {
            try {
                const msgs = await api.getMessages(id);
                // Any tool card persisted as `running` is necessarily stale —
                // the worker process that emitted it is long gone. Coerce to
                // `done` so the spinner doesn't hang forever on reload.
                const sanitized = msgs.map((m) => {
                    if (m.role === 'event' && m.event?.kind === 'tool_executed'
                        && m.event.tool?.status === 'running') {
                        return {
                            ...m,
                            event: {
                                ...m.event,
                                tool: { ...m.event.tool, status: 'done' as const },
                            },
                        };
                    }
                    return m;
                });
                messagesByAssistant.value = { ...messagesByAssistant.value, [id]: sanitized };
            } catch (e: any) {
                error.value = e?.message || 'Failed to load messages';
            }
        }
    }

    async function sendMessage(content: string) {
        if (activeId.value == null) return;
        const id = activeId.value;
        try {
            const { userMessage } = await api.sendMessage(id, content);
            const arr = messagesByAssistant.value[id] ?? [];
            messagesByAssistant.value = {
                ...messagesByAssistant.value,
                [id]: [...arr, userMessage],
            };
            pendingByAssistant.value = { ...pendingByAssistant.value, [id]: true };
            // Clear any leftover stream state from a previous turn so the
            // caret + buffer start fresh.
            if (streamingByAssistant.value[id] || streamDoneByAssistant.value[id]) {
                const s = { ...streamingByAssistant.value }; delete s[id];
                streamingByAssistant.value = s;
                const d = { ...streamDoneByAssistant.value }; delete d[id];
                streamDoneByAssistant.value = d;
            }
        } catch (e: any) {
            error.value = e?.message || 'Failed to send message';
        }
    }

    async function createHelper(payload: CreateAssistantPayload) {
        const created = await api.create(payload);
        assistants.value = [...assistants.value, created];
        return created;
    }

    async function updateAssistant(id: number, payload: UpdateAssistantPayload) {
        const updated = await api.update(id, payload);
        const idx = assistants.value.findIndex((a) => a.id === id);
        if (idx >= 0) assistants.value[idx] = updated;
        return updated;
    }

    async function deleteAssistant(id: number) {
        await api.remove(id);
        assistants.value = assistants.value.filter((a) => a.id !== id);
        delete messagesByAssistant.value[id];
        delete pendingByAssistant.value[id];
        if (activeId.value === id) {
            const personal = assistants.value.find((a) => a.isSystem);
            activeId.value = personal?.id ?? null;
        }
    }

    async function togglePin(id: number) {
        const a = assistants.value.find((x) => x.id === id);
        if (!a || a.isSystem) return;
        await updateAssistant(id, { pinned: !a.pinned });
    }

    return {
        assistants,
        activeId,
        messagesByAssistant,
        pendingByAssistant,
        loading,
        loaded,
        error,
        sortedAssistants,
        activeAssistant,
        activeMessages,
        isActivePending,
        activeStreaming,
        activeStreamDone,
        load,
        selectAssistant,
        sendMessage,
        createHelper,
        updateAssistant,
        deleteAssistant,
        togglePin,
        markEventEntityDeleted,
    };
});
