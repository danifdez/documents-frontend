import { defineStore } from 'pinia';
import type {
    Agent,
    AgentMessage,
    CreateAgentPayload,
    UpdateAgentPayload,
} from '../types/Agent';
import { useAgents } from '../services/agents/useAgents';
import { createChatStore } from './createChatStore';

export const useAgentStore = defineStore('agent', () => {
    const api = useAgents();

    // The backend already returns agents sorted by `pinned DESC,
    // lastSeenAt DESC NULLS LAST, id DESC`, so `sortedAgents` keeps the
    // default arrival order and the store and the UI agree on the order.
    const chat = createChatStore<Agent, AgentMessage, UpdateAgentPayload>({
        api,
        responseEvent: 'agentResponse',
        taskType: 'agent-chat',
        socketIdKey: 'agentId',
        loadErrorMessage: 'Failed to load agents',
    });

    async function createAgent(payload: CreateAgentPayload) {
        const created = await api.create(payload);
        // Insertion respects the backend ordering on reload. For immediate
        // feedback we push and rely on the next list() to authoritatively
        // re-order; for typical usage this is fine.
        chat.owners.value = [created, ...chat.owners.value];
        return created;
    }

    return {
        agents: chat.owners,
        activeId: chat.activeId,
        messagesByAgent: chat.messagesByOwner,
        pendingByAgent: chat.pendingByOwner,
        loading: chat.loading,
        loaded: chat.loaded,
        error: chat.error,
        sortedAgents: chat.sortedOwners,
        activeAgent: chat.activeOwner,
        activeMessages: chat.activeMessages,
        activeHasMore: chat.activeHasMore,
        activeLoadingOlder: chat.activeLoadingOlder,
        isActivePending: chat.isActivePending,
        activeConfirmations: chat.activeConfirmations,
        load: chat.load,
        selectAgent: chat.selectOwner,
        loadOlder: chat.loadOlder,
        sendMessage: chat.sendMessage,
        cancelActiveExecution: chat.cancelActiveExecution,
        decideConfirmation: chat.decideConfirmation,
        createAgent,
        updateAgent: chat.updateOwner,
        deleteAgent: chat.deleteOwner,
        togglePin: chat.togglePin,
    };
});
