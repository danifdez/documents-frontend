import apiClient from '../api';
import type {
    Assistant,
    AssistantMessage,
    CreateAssistantPayload,
    UpdateAssistantPayload,
} from '../../types/Assistant';

export function useAssistants() {
    const list = async (): Promise<Assistant[]> => {
        const { data } = await apiClient.get<Assistant[]>('/assistants');
        return data;
    };

    const create = async (payload: CreateAssistantPayload): Promise<Assistant> => {
        const { data } = await apiClient.post<Assistant>('/assistants', payload);
        return data;
    };

    const update = async (id: number, payload: UpdateAssistantPayload): Promise<Assistant> => {
        const { data } = await apiClient.patch<Assistant>(`/assistants/${id}`, payload);
        return data;
    };

    const remove = async (id: number): Promise<void> => {
        await apiClient.delete(`/assistants/${id}`);
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

    return { list, create, update, remove, getMessages, sendMessage };
}
