<template>
    <Transition name="memory-panel">
        <aside v-if="show" class="memory-panel">
            <header class="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-text-primary">Assistant memory</h3>
                    <p class="text-[11px] text-text-muted truncate">
                        {{ entries.length }} {{ entries.length === 1 ? 'memory' : 'memories' }} ·
                        injected into every message
                    </p>
                </div>
                <button @click="$emit('update:show', false)"
                    class="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                    title="Close (Esc)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </header>

            <div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
                <p class="text-[11px] text-text-muted italic">
                    The assistant adds memories as you talk. You can only forget them.
                </p>

                <div v-if="memoryStore.loading && entries.length === 0" class="flex justify-center py-6">
                    <LoadingSpinner size="sm" />
                </div>

                <div v-else-if="entries.length === 0"
                    class="text-xs text-text-muted italic text-center py-6 px-4">
                    No memories yet. As you chat, the assistant will note down what matters.
                </div>

                <div v-for="entry in entries" :key="entry.id"
                    class="rounded-lg border border-border bg-surface-elevated p-3 group">
                    <div class="flex items-start gap-2">
                        <span class="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded shrink-0"
                            :class="badgeClass(entry.type)">
                            {{ MEMORY_TYPE_LABEL[entry.type] }}
                        </span>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-mono text-text-primary truncate">{{ entry.name }}</div>
                        </div>
                        <button @click="handleRemove(entry.id, entry.name)" title="Forget"
                            class="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] text-text-muted hover:text-red-500 cursor-pointer">
                            Forget
                        </button>
                    </div>
                    <div class="mt-1.5 text-xs text-text-secondary whitespace-pre-wrap break-words">{{ entry.body }}</div>
                </div>
            </div>

            <footer v-if="entries.length > 0" class="border-t border-border px-4 py-2 shrink-0 flex justify-end">
                <button @click="handleClear"
                    class="text-[11px] text-text-muted hover:text-red-600 transition-colors cursor-pointer">
                    Clear all memory
                </button>
            </footer>
        </aside>
    </Transition>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import { useAssistantMemoryStore } from '../../store/assistantMemoryStore';
import { MEMORY_TYPE_LABEL, type MemoryEntryType } from '../../types/AssistantMemory';

const props = defineProps<{
    show: boolean;
    assistantId: number | null;
}>();

const emit = defineEmits<{
    (e: 'update:show', v: boolean): void;
}>();

const memoryStore = useAssistantMemoryStore();

const entries = computed(() =>
    props.assistantId != null ? memoryStore.entriesFor(props.assistantId) : [],
);

watch(
    () => [props.show, props.assistantId] as const,
    async ([show, id]) => {
        if (show && id != null) {
            await memoryStore.load(id);
        }
    },
    { immediate: true },
);

async function handleRemove(id: number, name: string) {
    if (!props.assistantId) return;
    if (!confirm(`Forget "${name}"?\nThe assistant will lose this information.`)) return;
    try {
        await memoryStore.remove(props.assistantId, id);
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Error forgetting memory');
    }
}

async function handleClear() {
    if (!props.assistantId) return;
    if (!confirm('Clear all memory?\nThis action cannot be undone.')) return;
    try {
        await memoryStore.clear(props.assistantId);
    } catch (e: any) {
        alert(e?.response?.data?.message || e?.message || 'Error clearing memory');
    }
}

function badgeClass(type: MemoryEntryType): string {
    switch (type) {
        case 'fact':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'event':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
        case 'instruction':
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
        default:
            return 'bg-surface text-text-muted border border-border';
    }
}
</script>

<style scoped>
.memory-panel {
    width: 22rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background-color: var(--color-surface);
    border-left: 1px solid var(--color-border);
}

.memory-panel-enter-active,
.memory-panel-leave-active {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.memory-panel-enter-from,
.memory-panel-leave-to {
    transform: translateX(20px);
    opacity: 0;
}
</style>
