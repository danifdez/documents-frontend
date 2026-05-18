export interface Agent {
    id: number;
    name: string;
    systemPrompt: string | null;
    folderScope: string | null;
    icon: string | null;
    sub: string | null;
    pinned: boolean;
    lastSeenAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AgentMessage {
    id: number;
    agentId: number;
    role: 'user' | 'assistant' | 'system' | 'event';
    content: string;
    jobId: number | null;
    error: string | null;
    event: import('./Assistant').AssistantMessageEvent | null;
    createdAt: string;
}

export interface CreateAgentPayload {
    name: string;
    systemPrompt?: string;
    folderScope?: string | null;
    icon?: string;
    sub?: string;
    pinned?: boolean;
}

export type UpdateAgentPayload = Partial<CreateAgentPayload>;

export interface AgentResponseEvent {
    agentId: number;
    jobId: number;
    message: AgentMessage;
}

export interface AgentToolEventPayload {
    agentId: number;
    jobId: number;
    eventMessage: AgentMessage;
}

export interface AgentStreamChunkEvent {
    agentId: number;
    jobId: number;
    chunk: string;
    done?: boolean;
}
