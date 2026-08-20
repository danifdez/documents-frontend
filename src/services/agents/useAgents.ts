import apiClient from '../api';
import type {
    Agent,
    AgentMessage,
    CreateAgentPayload,
    UpdateAgentPayload,
} from '../../types/Agent';

export function useAgents() {
    const list = async (): Promise<Agent[]> => {
        const { data } = await apiClient.get<Agent[]>('/agents');
        return data;
    };

    const get = async (id: number): Promise<Agent> => {
        const { data } = await apiClient.get<Agent>(`/agents/${id}`);
        return data;
    };

    const create = async (payload: CreateAgentPayload): Promise<Agent> => {
        const { data } = await apiClient.post<Agent>('/agents', payload);
        return data;
    };

    const update = async (id: number, payload: UpdateAgentPayload): Promise<Agent> => {
        const { data } = await apiClient.patch<Agent>(`/agents/${id}`, payload);
        return data;
    };

    const remove = async (id: number): Promise<void> => {
        await apiClient.delete(`/agents/${id}`);
    };

    const getMessages = async (
        id: number,
        opts: { limit?: number; before?: number } = {},
    ): Promise<{ messages: AgentMessage[]; hasMore: boolean }> => {
        const params: Record<string, number> = {};
        if (opts.limit != null) params.limit = opts.limit;
        if (opts.before != null) params.before = opts.before;
        const { data } = await apiClient.get<{ messages: AgentMessage[]; hasMore: boolean }>(
            `/agents/${id}/messages`,
            { params },
        );
        return data;
    };

    const sendMessage = async (
        id: number,
        content: string,
    ): Promise<{ userMessage: AgentMessage; executionId: string }> => {
        const { data } = await apiClient.post(`/agents/${id}/messages`, { content });
        return data;
    };

    return { list, get, create, update, remove, getMessages, sendMessage };
}
