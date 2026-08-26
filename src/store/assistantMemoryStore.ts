import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
    MemoryEntry,
    CreateMemoryEntryPayload,
    UpdateMemoryEntryPayload,
} from '../types/AssistantMemory';
import { useAssistantMemory } from '../services/assistants/useAssistantMemory';

export const useAssistantMemoryStore = defineStore('assistantMemory', () => {
    const api = useAssistantMemory();

    const entriesByAssistant = ref<Record<number, MemoryEntry[]>>({});
    const loaded = ref<Record<number, boolean>>({});
    const loading = ref(false);
    const error = ref<string | null>(null);

    function entriesFor(assistantId: number): MemoryEntry[] {
        return entriesByAssistant.value[assistantId] ?? [];
    }

    async function load(assistantId: number, force = false): Promise<void> {
        if (loaded.value[assistantId] && !force) return;
        loading.value = true;
        error.value = null;
        try {
            const entries = await api.list(assistantId);
            entriesByAssistant.value = { ...entriesByAssistant.value, [assistantId]: entries };
            loaded.value = { ...loaded.value, [assistantId]: true };
        } catch (e: any) {
            error.value = e?.response?.data?.message || e?.message || 'Error loading memory';
        } finally {
            loading.value = false;
        }
    }

    async function add(assistantId: number, payload: CreateMemoryEntryPayload): Promise<MemoryEntry> {
        const created = await api.create(assistantId, payload);
        const current = entriesByAssistant.value[assistantId] ?? [];
        entriesByAssistant.value = {
            ...entriesByAssistant.value,
            [assistantId]: [created, ...current],
        };
        return created;
    }

    async function update(
        assistantId: number,
        id: string,
        payload: UpdateMemoryEntryPayload,
    ): Promise<MemoryEntry> {
        const updated = await api.update(assistantId, id, payload);
        const current = entriesByAssistant.value[assistantId] ?? [];
        entriesByAssistant.value = {
            ...entriesByAssistant.value,
            [assistantId]: current.map((e) => (e.id === id ? updated : e)),
        };
        return updated;
    }

    async function remove(assistantId: number, id: string): Promise<void> {
        await api.remove(assistantId, id);
        const current = entriesByAssistant.value[assistantId] ?? [];
        entriesByAssistant.value = {
            ...entriesByAssistant.value,
            [assistantId]: current.filter((e) => e.id !== id),
        };
    }

    async function clear(assistantId: number): Promise<void> {
        await api.clear(assistantId);
        entriesByAssistant.value = { ...entriesByAssistant.value, [assistantId]: [] };
    }

    return {
        entriesByAssistant,
        loading,
        loaded,
        error,
        entriesFor,
        load,
        add,
        update,
        remove,
        clear,
    };
});
