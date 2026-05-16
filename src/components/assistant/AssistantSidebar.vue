<template>
    <aside class="w-64 shrink-0 flex flex-col border-r border-border bg-surface">
        <div v-if="store.loading && !store.loaded" class="flex justify-center py-6">
            <LoadingSpinner size="sm" />
        </div>

        <div v-else class="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
            <!-- Personal assistant -->
            <div v-for="a in personalAssistants" :key="a.id"
                class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                :class="a.id === store.activeId
                    ? 'bg-accent-subtle text-accent-dark'
                    : 'hover:bg-surface-hover text-text-secondary'"
                @click="store.selectAssistant(a.id)">
                <div class="flex items-center gap-2">
                    <span class="text-lg leading-none">{{ a.icon || '◇' }}</span>
                    <span class="text-sm font-semibold">{{ a.name }}</span>
                </div>
                <div class="text-[11px] text-text-muted mt-0.5 pl-7">{{ a.sub || 'Your personal assistant' }}</div>
            </div>

            <!-- Helpers header + new -->
            <div class="flex items-center justify-between pt-2">
                <h4 class="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Helpers</h4>
                <button @click="$emit('new-helper')"
                    class="text-[11px] text-text-secondary hover:text-text-primary px-2 py-0.5 rounded hover:bg-surface-hover transition-colors cursor-pointer">
                    + New
                </button>
            </div>

            <!-- Helpers -->
            <div v-if="helperAssistants.length === 0" class="text-[11px] text-text-muted italic px-3 py-2">
                You haven't created any helpers yet.
            </div>

            <div v-for="a in helperAssistants" :key="a.id"
                class="px-3 py-2.5 rounded-lg cursor-pointer transition-colors group"
                :class="a.id === store.activeId
                    ? 'bg-accent-subtle text-accent-dark'
                    : 'hover:bg-surface-hover text-text-secondary'"
                @click="store.selectAssistant(a.id)">
                <div class="flex items-center gap-2">
                    <span v-if="a.pinned" class="text-amber-500 text-xs">★</span>
                    <span class="text-sm font-medium truncate flex-1">{{ a.name }}</span>
                    <button
                        class="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-surface text-text-muted hover:text-text-primary cursor-pointer"
                        @click.stop="$emit('edit-helper', a)"
                        title="Edit helper">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </div>
                <div v-if="a.sub" class="text-[11px] text-text-muted mt-0.5">{{ a.sub }}</div>
                <div v-if="a.lastSeenAt" class="text-[10px] text-text-muted mt-0.5">{{ formatRelative(a.lastSeenAt) }}
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import { useAssistantStore } from '../../store/assistantStore';
import type { Assistant } from '../../types/Assistant';

defineEmits<{
    (e: 'new-helper'): void;
    (e: 'edit-helper', a: Assistant): void;
}>();

const store = useAssistantStore();

const personalAssistants = computed(() => store.sortedAssistants.filter((a) => a.isSystem));
const helperAssistants = computed(() => store.sortedAssistants.filter((a) => !a.isSystem));

function formatRelative(iso: string): string {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'now';
    if (min < 60) return `${min} min ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} h ago`;
    const days = Math.floor(h / 24);
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days} d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks} w ago`;
}
</script>
