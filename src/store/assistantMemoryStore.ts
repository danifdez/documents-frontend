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
        id: number,
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

    async function remove(assistantId: number, id: number): Promise<void> {
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

    /**
     * Insert a memory entry that arrived via socket (the worker extracted it
     * after a chat message). De-duplicates by id. No HTTP call.
     */
    function ingestSocketEntry(entry: MemoryEntry): void {
        if (!entry || typeof entry.id !== 'number') return;
        const current = entriesByAssistant.value[entry.assistantId] ?? [];
        if (current.some((e) => e.id === entry.id)) return;
        entriesByAssistant.value = {
            ...entriesByAssistant.value,
            [entry.assistantId]: [entry, ...current],
        };
    }

    /**
     * Drop a memory entry locally — the backend has already deleted it.
     * Called when a `memory_forgotten` event arrives over the socket so the
     * panel updates without a refetch.
     */
    function dropSocketEntry(assistantId: number, entryId: number): void {
        const current = entriesByAssistant.value[assistantId];
        if (!current) return;
        const next = current.filter((e) => e.id !== entryId);
        if (next.length === current.length) return;
        entriesByAssistant.value = {
            ...entriesByAssistant.value,
            [assistantId]: next,
        };
    }

    /**
     * Replace a memory entry in place. Used when a `memory_replaced` event
     * arrives over the socket — either because the worker detected a
     * correction (via: 'llm') or because the backend auto-dedup converted a
     * save into a replace (via: 'auto_dedup').
     */
    function replaceSocketEntry(entry: MemoryEntry): void {
        if (!entry || typeof entry.id !== 'number') return;
        const current = entriesByAssistant.value[entry.assistantId] ?? [];
        const idx = current.findIndex((e) => e.id === entry.id);
        if (idx === -1) {
            entriesByAssistant.value = {
                ...entriesByAssistant.value,
                [entry.assistantId]: [entry, ...current],
            };
            return;
        }
        const next = current.slice();
        next[idx] = entry;
        entriesByAssistant.value = {
            ...entriesByAssistant.value,
            [entry.assistantId]: next,
        };
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
        ingestSocketEntry,
        dropSocketEntry,
        replaceSocketEntry,
    };
});
