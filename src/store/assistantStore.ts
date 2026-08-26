import { defineStore } from 'pinia';
import type {
    Assistant,
    AssistantMessage,
} from '../types/Assistant';
import { useAssistants } from '../services/assistants/useAssistants';
import { createChatStore } from './createChatStore';

export const useAssistantStore = defineStore('assistant', () => {
    const api = useAssistants();

    const chat = createChatStore<Assistant, AssistantMessage, never>({
        api,
        responseEvent: 'assistantResponse',
        taskType: 'assistant-chat',
        socketIdKey: 'assistantId',
        loadErrorMessage: 'Failed to load assistants',
        hooks: {
            afterLoad({ owners, activeId }) {
                if (activeId.value == null) {
                    activeId.value = owners.value[0]?.id ?? null;
                }
            },
        },
    });

    async function updateWorkingFolder(folderScope: string | null) {
        const assistant = chat.activeOwner.value;
        if (!assistant) return null;
        const updated = await api.updateWorkingFolder(assistant.id, folderScope);
        const index = chat.owners.value.findIndex((item) => item.id === updated.id);
        if (index >= 0) chat.owners.value[index] = updated;
        return updated;
    }

    return {
        assistants: chat.owners,
        activeId: chat.activeId,
        messagesByAssistant: chat.messagesByOwner,
        pendingByAssistant: chat.pendingByOwner,
        loading: chat.loading,
        loaded: chat.loaded,
        error: chat.error,
        sortedAssistants: chat.sortedOwners,
        activeAssistant: chat.activeOwner,
        activeMessages: chat.activeMessages,
        activeHasMore: chat.activeHasMore,
        activeLoadingOlder: chat.activeLoadingOlder,
        isActivePending: chat.isActivePending,
        activeExecutionProgress: chat.activeExecutionProgress,
        activeConfirmations: chat.activeConfirmations,
        load: chat.load,
        selectAssistant: chat.selectOwner,
        loadOlder: chat.loadOlder,
        sendMessage: chat.sendMessage,
        cancelActiveExecution: chat.cancelActiveExecution,
        decideConfirmation: chat.decideConfirmation,
        updateWorkingFolder,
    };
});
