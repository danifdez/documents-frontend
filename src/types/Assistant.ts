export interface Assistant {
    id: number;
    name: string;
    folderScope: string | null;
    icon: string | null;
    sub: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type AssistantMessageEvent = { kind: string; [k: string]: any };

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
