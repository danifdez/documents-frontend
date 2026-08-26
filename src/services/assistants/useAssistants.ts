import apiClient from '../api';
import type {
    Assistant,
    AssistantMessage,
} from '../../types/Assistant';

export function useAssistants() {
    const list = async (): Promise<Assistant[]> => {
        const { data } = await apiClient.get<Assistant[]>('/assistants');
        return data;
    };

    const getMessages = async (
        id: number,
        opts: { limit?: number; before?: number } = {},
    ): Promise<{ messages: AssistantMessage[]; hasMore: boolean }> => {
        const params: Record<string, number> = {};
        if (opts.limit != null) params.limit = opts.limit;
        if (opts.before != null) params.before = opts.before;
        const { data } = await apiClient.get<{ messages: AssistantMessage[]; hasMore: boolean }>(
            `/assistants/${id}/messages`,
            { params },
        );
        return data;
    };

    const sendMessage = async (
        id: number,
        content: string,
    ): Promise<{ userMessage: AssistantMessage; executionId: string }> => {
        const { data } = await apiClient.post(`/assistants/${id}/messages`, { content });
        return data;
    };

    const updateWorkingFolder = async (
        id: number,
        folderScope: string | null,
    ): Promise<Assistant> => {
        const { data } = await apiClient.patch<Assistant>(
            `/assistants/${id}/working-folder`,
            { folderScope },
        );
        return data;
    };

    return { list, getMessages, sendMessage, updateWorkingFolder };
}
