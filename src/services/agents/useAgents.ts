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

    const getMessages = async (id: number): Promise<AgentMessage[]> => {
        const { data } = await apiClient.get<AgentMessage[]>(`/agents/${id}/messages`);
        return data;
    };

    const sendMessage = async (
        id: number,
        content: string,
    ): Promise<{ userMessage: AgentMessage; jobId: number | null }> => {
        const { data } = await apiClient.post(`/agents/${id}/messages`, { content });
        return data;
    };

    return { list, get, create, update, remove, getMessages, sendMessage };
}
