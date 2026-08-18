import apiClient from '../api';

/** URL segment of the chat-owner resource (`/agents/…` vs `/assistants/…`). */
export type ChatOwnerSegment = 'agents' | 'assistants';

export interface ChatEventEntityRef {
    kind: 'note' | 'task' | 'indexedFile';
    id: number;
}

/**
 * HTTP calls the chat views make around event cards (confirm/cancel a
 * pending tool, delete an entity a tool created, agent folder actions).
 * Kept out of the components so they stay free of apiClient plumbing.
 */
export function useChatEventApi() {
    /** Persist the resolution of a pending-confirmation card. */
    const patchMessageEventStatus = async (
        segment: ChatOwnerSegment,
        ownerId: number,
        messageId: number,
        status: 'done' | 'cancelled',
        summary: string,
    ): Promise<void> => {
        await apiClient.patch(
            `/${segment}/${ownerId}/messages/${messageId}/event-status`,
            { status, summary },
        );
    };

    /** Confirmed `folder_delete` on an agent's working folder. */
    const deleteAgentIndexedFile = async (
        agentId: number,
        indexedFileId: number,
    ): Promise<void> => {
        await apiClient.delete(`/agents/${agentId}/indexed-files/${indexedFileId}`);
    };

    /** Confirmed `folder_overwrite` on an agent's working folder. */
    const overwriteAgentIndexedFile = async (
        agentId: number,
        body: Record<string, any>,
    ): Promise<void> => {
        await apiClient.post(`/agents/${agentId}/indexed-files`, body);
    };

    /** Delete the note/task an event card points at. */
    const deleteEventEntity = async (entity: ChatEventEntityRef): Promise<void> => {
        const path = entity.kind === 'note' ? `/notes/${entity.id}` : `/user-tasks/${entity.id}`;
        await apiClient.delete(path);
    };

    return {
        patchMessageEventStatus,
        deleteAgentIndexedFile,
        overwriteAgentIndexedFile,
        deleteEventEntity,
    };
}
