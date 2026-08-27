export type MemoryEntryType = 'fact' | 'preference' | 'episode';
export type MemoryEntrySource = 'manual' | 'confirmed_tool' | 'import';

export interface MemoryEntry {
    id: string;
    assistantId: number | null;
    agentId: number | null;
    name: string;
    type: MemoryEntryType;
    body: string;
    contentHash: string;
    sourceKind: MemoryEntrySource;
    consentStatus: 'granted';
    consentBasis: 'explicit_user_action' | 'confirmed_tool_plan' | 'imported_with_consent';
    consentedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMemoryEntryPayload {
    name: string;
    type: MemoryEntryType;
    body: string;
}

export type UpdateMemoryEntryPayload = Partial<CreateMemoryEntryPayload>;

export const MEMORY_TYPE_LABEL: Record<MemoryEntryType, string> = {
    fact: 'fact',
    episode: 'episode',
    preference: 'preference',
};
