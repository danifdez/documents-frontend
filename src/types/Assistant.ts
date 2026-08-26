export interface Assistant {
    id: number;
    name: string;
    systemPrompt: string | null;
    folderScope: string | null;
    icon: string | null;
    isSystem: boolean;
    pinned: boolean;
    sub: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type AssistantMessageEvent =
    | { kind: 'memory_saved'; entry: import('./AssistantMemory').MemoryEntry }
    | { kind: 'memory_forgotten'; entry: import('./AssistantMemory').MemoryEntry }
    | {
        kind: 'memory_replaced';
        entry: import('./AssistantMemory').MemoryEntry;
        previousId: number;
        via: 'llm' | 'auto_dedup';
        score?: number;
    }
    | { kind: string; [k: string]: any };

export interface AssistantMessage {
    id: number;
    assistantId: number;
    role: 'user' | 'assistant' | 'system' | 'event';
    content: string;
    executionId: string | null;
    error: string | null;
    event: AssistantMessageEvent | null;
    createdAt: string;
}

export interface CreateAssistantPayload {
    name: string;
    systemPrompt?: string;
    folderScope?: string;
    icon?: string;
    sub?: string;
    pinned?: boolean;
}

export type UpdateAssistantPayload = Partial<CreateAssistantPayload>;

export interface AssistantResponseEvent {
    assistantId: number;
    executionId: string;
    eventMessages?: AssistantMessage[];
    message: AssistantMessage;
}
