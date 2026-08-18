import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
    Assistant,
    AssistantMessage,
    UpdateAssistantPayload,
} from '../types/Assistant';
import { useAssistants } from '../services/assistants/useAssistants';
import { useAssistantMemoryStore } from './assistantMemoryStore';
import { createChatStore } from './createChatStore';

export const useAssistantStore = defineStore('assistant', () => {
    const api = useAssistants();

    // Bumped whenever a chat tool mutates user tasks. Workspace-wide rather
    // than per-assistant since tasks are global. TaskPanel watches it.
    const userTasksVersion = ref(0);

    const TASK_MUTATING_TOOLS = new Set(['create_task', 'update_task']);

    function bumpUserTasksVersion() {
        userTasksVersion.value += 1;
    }

    // Captured when the socket attaches (same moment the old monolithic store
    // instantiated it) so the response handler can sync memory cards.
    let memoryStore: ReturnType<typeof useAssistantMemoryStore> | null = null;

    const chat = createChatStore<Assistant, AssistantMessage, UpdateAssistantPayload>({
        api,
        events: {
            toolEvent: 'assistantToolEvent',
            streamChunk: 'assistantStreamChunk',
            response: 'assistantResponse',
        },
        socketIdKey: 'assistantId',
        loadErrorMessage: 'Failed to load assistants',
        sortOwners: (list) => list.sort((a, b) => {
            if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            const lsA = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
            const lsB = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
            if (lsA !== lsB) return lsB - lsA;
            return a.id - b.id;
        }),
        hooks: {
            onSocketAttached() {
                memoryStore = useAssistantMemoryStore();
            },
            onToolEvent(toolName, toolStatus) {
                if (toolName && TASK_MUTATING_TOOLS.has(toolName) && toolStatus === 'done') {
                    bumpUserTasksVersion();
                }
            },
            collectResponseEventMessages(event, existing) {
                const toAppend: AssistantMessage[] = [];
                for (const ev of (event.eventMessages as AssistantMessage[] | undefined) ?? []) {
                    if (ev && !existing.some((m) => m.id === ev.id)) {
                        toAppend.push(ev);
                        // Side-effect: keep the memory store in sync with what
                        // happened on the backend.
                        if (ev.event?.kind === 'memory_saved' && ev.event.entry) {
                            memoryStore?.ingestSocketEntry(ev.event.entry);
                        } else if (ev.event?.kind === 'memory_forgotten' && ev.event.entry) {
                            memoryStore?.dropSocketEntry(event.assistantId, ev.event.entry.id);
                        } else if (ev.event?.kind === 'memory_replaced' && ev.event.entry) {
                            memoryStore?.replaceSocketEntry(ev.event.entry);
                        }
                    }
                }
                return toAppend;
            },
            afterLoad({ owners, activeId }) {
                if (activeId.value == null) {
                    const personal = owners.value.find((a) => a.isSystem);
                    if (personal) activeId.value = personal.id;
                }
            },
            onToolStatusResolved(status, toolKind) {
                if (status === 'done' && toolKind === 'task_delete') {
                    bumpUserTasksVersion();
                }
            },
            canTogglePin: (a) => !a.isSystem,
            nextActiveIdAfterDelete: ({ owners }) => {
                const personal = owners.value.find((a) => a.isSystem);
                return personal?.id ?? null;
            },
        },
    });

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
        activeStreaming: chat.activeStreaming,
        activeStreamDone: chat.activeStreamDone,
        load: chat.load,
        selectAssistant: chat.selectOwner,
        loadOlder: chat.loadOlder,
        sendMessage: chat.sendMessage,
        updateAssistant: chat.updateOwner,
        deleteAssistant: chat.deleteOwner,
        togglePin: chat.togglePin,
        markEventEntityDeleted: chat.markEventEntityDeleted,
        updateEventToolStatus: chat.updateEventToolStatus,
        folderFilesVersionFor: chat.folderFilesVersionFor,
        bumpFolderFilesVersion: chat.bumpFolderFilesVersion,
        userTasksVersion,
        bumpUserTasksVersion,
    };
});
