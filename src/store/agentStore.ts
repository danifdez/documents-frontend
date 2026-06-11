import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
    Agent,
    AgentMessage,
    CreateAgentPayload,
    UpdateAgentPayload,
    AgentResponseEvent,
} from '../types/Agent';
import { useAgents } from '../services/agents/useAgents';
import { getSocket } from '../services/notifications/notification';
import {
    FOLDER_MUTATING_TOOLS,
    coerceRunningToolsToDone,
    mergeToolEventMessage,
    withToolStatus,
    withEntityDeleted,
} from '../composables/chatMessageEvents';

export const useAgentStore = defineStore('agent', () => {
    const api = useAgents();

    const agents = ref<Agent[]>([]);
    const activeId = ref<number | null>(null);
    const messagesByAgent = ref<Record<number, AgentMessage[]>>({});
    const pendingByAgent = ref<Record<number, boolean>>({});
    const streamingByAgent = ref<Record<number, string>>({});
    const streamDoneByAgent = ref<Record<number, boolean>>({});
    const loading = ref(false);
    const loaded = ref(false);
    const error = ref<string | null>(null);
    const folderFilesVersionByAgent = ref<Record<number, number>>({});
    let socketAttached = false;

    function bumpFolderFilesVersion(agentId: number) {
        const prev = folderFilesVersionByAgent.value[agentId] ?? 0;
        folderFilesVersionByAgent.value = {
            ...folderFilesVersionByAgent.value,
            [agentId]: prev + 1,
        };
    }

    // The backend already returns agents sorted by `pinned DESC,
    // lastSeenAt DESC NULLS LAST, id DESC`. We expose `sortedAgents` as
    // the array in arrival order so the store and the UI agree on the order.
    const sortedAgents = computed<Agent[]>(() => [...agents.value]);

    const activeAgent = computed<Agent | null>(() => {
        if (activeId.value == null) return null;
        return agents.value.find((a) => a.id === activeId.value) ?? null;
    });

    const activeMessages = computed<AgentMessage[]>(() => {
        if (activeId.value == null) return [];
        return messagesByAgent.value[activeId.value] ?? [];
    });

    const isActivePending = computed(() => {
        if (activeId.value == null) return false;
        return !!pendingByAgent.value[activeId.value];
    });

    const activeStreaming = computed<string>(() => {
        if (activeId.value == null) return '';
        return streamingByAgent.value[activeId.value] ?? '';
    });

    const activeStreamDone = computed<boolean>(() => {
        if (activeId.value == null) return false;
        return !!streamDoneByAgent.value[activeId.value];
    });

    function _attachSocket() {
        if (socketAttached) return;
        const socket = getSocket();

        socket.on('agentToolEvent', (event: { agentId: number; eventMessage: AgentMessage }) => {
            if (!event?.agentId || !event?.eventMessage) return;
            const arr = messagesByAgent.value[event.agentId] ?? [];
            const incoming = event.eventMessage;
            const toolName = incoming.event?.kind === 'tool_executed'
                ? incoming.event.tool?.name
                : undefined;
            const toolStatus = incoming.event?.kind === 'tool_executed'
                ? incoming.event.tool?.status
                : undefined;
            if (toolName && FOLDER_MUTATING_TOOLS.has(toolName) && toolStatus === 'done') {
                bumpFolderFilesVersion(event.agentId);
            }
            messagesByAgent.value = {
                ...messagesByAgent.value,
                [event.agentId]: mergeToolEventMessage(arr, incoming),
            };
        });

        socket.on('agentStreamChunk', (event: { agentId: number; chunk: string; done?: boolean }) => {
            if (!event?.agentId) return;
            if (typeof event.chunk === 'string' && event.chunk.length > 0) {
                const prev = streamingByAgent.value[event.agentId] ?? '';
                streamingByAgent.value = {
                    ...streamingByAgent.value,
                    [event.agentId]: prev + event.chunk,
                };
            }
            if (event.done) {
                streamDoneByAgent.value = {
                    ...streamDoneByAgent.value,
                    [event.agentId]: true,
                };
            }
        });

        socket.on('agentResponse', (event: AgentResponseEvent) => {
            if (!event?.agentId || !event?.message) return;
            let arr = messagesByAgent.value[event.agentId] ?? [];

            const coerced = coerceRunningToolsToDone(arr);
            arr = coerced.messages;
            let mutated = coerced.mutated;

            if (!arr.some((m) => m.id === event.message.id)) {
                arr = [...arr, event.message];
                mutated = true;
            }
            if (mutated) {
                messagesByAgent.value = {
                    ...messagesByAgent.value,
                    [event.agentId]: arr,
                };
            }
            pendingByAgent.value = {
                ...pendingByAgent.value,
                [event.agentId]: false,
            };
            if (streamingByAgent.value[event.agentId]) {
                const next = { ...streamingByAgent.value };
                delete next[event.agentId];
                streamingByAgent.value = next;
            }
            if (streamDoneByAgent.value[event.agentId]) {
                const next = { ...streamDoneByAgent.value };
                delete next[event.agentId];
                streamDoneByAgent.value = next;
            }
            const idx = agents.value.findIndex((a) => a.id === event.agentId);
            if (idx >= 0) {
                agents.value[idx] = {
                    ...agents.value[idx],
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
            agents.value = await api.list();
            loaded.value = true;
            _attachSocket();
        } catch (e: any) {
            error.value = e?.message || 'Failed to load agents';
        } finally {
            loading.value = false;
        }
    }

    function updateEventToolStatus(messageId: number, status: 'done' | 'cancelled', summary?: string): void {
        const aid = activeId.value;
        if (aid == null) return;
        const arr = messagesByAgent.value[aid];
        if (!arr) return;
        const idx = arr.findIndex((m) => m.id === messageId);
        if (idx < 0) return;
        const msg = arr[idx];
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool) return;
        const next = [...arr];
        const toolName = msg.event.tool.name;
        const toolKind = (msg.event.tool as any).kind as string | undefined;
        next[idx] = withToolStatus(msg, status, summary);
        messagesByAgent.value = { ...messagesByAgent.value, [aid]: next };
        if (status === 'done' && (
            FOLDER_MUTATING_TOOLS.has(toolName)
            || (toolKind && FOLDER_MUTATING_TOOLS.has(toolKind))
        )) {
            bumpFolderFilesVersion(aid);
        }
    }

    function folderFilesVersionFor(agentId: number): number {
        return folderFilesVersionByAgent.value[agentId] ?? 0;
    }

    function markEventEntityDeleted(messageId: number): void {
        const aid = activeId.value;
        if (aid == null) return;
        const arr = messagesByAgent.value[aid];
        if (!arr) return;
        const idx = arr.findIndex((m) => m.id === messageId);
        if (idx < 0) return;
        const msg = arr[idx];
        if (msg.event?.kind !== 'tool_executed' || !msg.event.tool?.entity) return;
        const next = [...arr];
        next[idx] = withEntityDeleted(msg);
        messagesByAgent.value = { ...messagesByAgent.value, [aid]: next };
    }

    async function selectAgent(id: number) {
        activeId.value = id;
        if (!messagesByAgent.value[id]) {
            try {
                const msgs = await api.getMessages(id);
                const sanitized = coerceRunningToolsToDone(msgs).messages;
                messagesByAgent.value = { ...messagesByAgent.value, [id]: sanitized };
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
            const arr = messagesByAgent.value[id] ?? [];
            messagesByAgent.value = {
                ...messagesByAgent.value,
                [id]: [...arr, userMessage],
            };
            pendingByAgent.value = { ...pendingByAgent.value, [id]: true };
            if (streamingByAgent.value[id] || streamDoneByAgent.value[id]) {
                const s = { ...streamingByAgent.value }; delete s[id];
                streamingByAgent.value = s;
                const d = { ...streamDoneByAgent.value }; delete d[id];
                streamDoneByAgent.value = d;
            }
        } catch (e: any) {
            error.value = e?.message || 'Failed to send message';
        }
    }

    async function createAgent(payload: CreateAgentPayload) {
        const created = await api.create(payload);
        // Insertion respects the backend ordering on reload. For immediate
        // feedback we push and rely on the next list() to authoritatively
        // re-order; for typical usage this is fine.
        agents.value = [created, ...agents.value];
        return created;
    }

    async function updateAgent(id: number, payload: UpdateAgentPayload) {
        const updated = await api.update(id, payload);
        const idx = agents.value.findIndex((a) => a.id === id);
        if (idx >= 0) agents.value[idx] = updated;
        return updated;
    }

    async function deleteAgent(id: number) {
        await api.remove(id);
        agents.value = agents.value.filter((a) => a.id !== id);
        delete messagesByAgent.value[id];
        delete pendingByAgent.value[id];
        if (activeId.value === id) activeId.value = null;
    }

    async function togglePin(id: number) {
        const a = agents.value.find((x) => x.id === id);
        if (!a) return;
        await updateAgent(id, { pinned: !a.pinned });
    }

    return {
        agents,
        activeId,
        messagesByAgent,
        pendingByAgent,
        loading,
        loaded,
        error,
        sortedAgents,
        activeAgent,
        activeMessages,
        isActivePending,
        activeStreaming,
        activeStreamDone,
        load,
        selectAgent,
        sendMessage,
        createAgent,
        updateAgent,
        deleteAgent,
        togglePin,
        markEventEntityDeleted,
        updateEventToolStatus,
        folderFilesVersionFor,
        bumpFolderFilesVersion,
    };
});
