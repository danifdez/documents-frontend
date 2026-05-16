import apiClient from '../api';
import type {
    MemoryEntry,
    CreateMemoryEntryPayload,
    UpdateMemoryEntryPayload,
} from '../../types/AssistantMemory';

export function useAssistantMemory() {
    const list = async (assistantId: number): Promise<MemoryEntry[]> => {
        const { data } = await apiClient.get<MemoryEntry[]>(`/assistants/${assistantId}/memory`);
        return data;
    };

    const create = async (
        assistantId: number,
        payload: CreateMemoryEntryPayload,
    ): Promise<MemoryEntry> => {
        const { data } = await apiClient.post<MemoryEntry>(
            `/assistants/${assistantId}/memory`,
            payload,
        );
        return data;
    };

    const update = async (
        assistantId: number,
        id: number,
        payload: UpdateMemoryEntryPayload,
    ): Promise<MemoryEntry> => {
        const { data } = await apiClient.patch<MemoryEntry>(
            `/assistants/${assistantId}/memory/${id}`,
            payload,
        );
        return data;
    };

    const remove = async (assistantId: number, id: number): Promise<void> => {
        await apiClient.delete(`/assistants/${assistantId}/memory/${id}`);
    };

    const clear = async (assistantId: number): Promise<{ deleted: number }> => {
        const { data } = await apiClient.delete<{ deleted: number }>(
            `/assistants/${assistantId}/memory`,
        );
        return data;
    };

    return { list, create, update, remove, clear };
}
