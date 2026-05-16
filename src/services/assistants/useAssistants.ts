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

    const getMessages = async (id: number): Promise<AssistantMessage[]> => {
        const { data } = await apiClient.get<AssistantMessage[]>(`/assistants/${id}/messages`);
        return data;
    };

    const sendMessage = async (
        id: number,
        content: string,
    ): Promise<{ userMessage: AssistantMessage; jobId: number | null }> => {
        const { data } = await apiClient.post(`/assistants/${id}/messages`, { content });
        return data;
    };

    return { list, create, update, remove, getMessages, sendMessage };
}
