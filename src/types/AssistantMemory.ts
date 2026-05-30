export type MemoryEntryType = 'fact' | 'episode' | 'instruction';
export type MemoryEntrySource = 'manual' | 'detected' | 'imported';

export interface MemoryEntry {
    id: number;
    assistantId: number;
    name: string;
    type: MemoryEntryType;
    body: string;
    source: MemoryEntrySource;
    createdAt: string;
    updatedAt: string;
}

export interface CreateMemoryEntryPayload {
    name: string;
    type: MemoryEntryType;
    body: string;
}

export type UpdateMemoryEntryPayload = Partial<CreateMemoryEntryPayload>;

export const MEMORY_TYPES: MemoryEntryType[] = ['fact', 'episode', 'instruction'];

export const MEMORY_TYPE_LABEL: Record<MemoryEntryType, string> = {
    fact: 'fact',
    episode: 'episode',
    instruction: 'instruction',
};
