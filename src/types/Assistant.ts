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
        kind: 'tool_executed';
        tool: {
            name: string;
            args: string;
            summary: string;
            status?: 'running' | 'done';
            // Set when the tool created something deletable (note, task, …).
            // Drives the "Delete" action button on the card.
            entity?: { kind: 'note' | 'task'; id: number; title?: string; deleted?: boolean };
        };
    }
    | { kind: string; [k: string]: any };

export interface AssistantMessage {
    id: number;
    assistantId: number;
    role: 'user' | 'assistant' | 'system' | 'event';
    content: string;
    jobId: number | null;
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
    jobId: number;
    eventMessages?: AssistantMessage[];
    message: AssistantMessage;
}
