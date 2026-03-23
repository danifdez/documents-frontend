<template>
    <router-link :to="`/notes/${note.id}`"
        class="group block bg-surface-elevated rounded-xl border border-border hover:border-accent/30 transition-all duration-300 ease-out overflow-hidden hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5">
        <div class="p-3">
            <div class="flex items-start justify-between mb-2">
                <div
                    class="w-7 h-7 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-0.5"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
            </div>

            <h4 class="font-semibold text-xs text-text-primary mb-1 truncate tracking-tight">
                {{ note.title }}
            </h4>

            <p v-if="snippet" class="text-text-secondary text-[11px] leading-snug line-clamp-2">
                {{ snippet }}
            </p>
            <p v-else class="text-text-muted text-[11px] italic">No content</p>

            <div class="flex items-center gap-2 mt-2">
                <span v-if="note.project" class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                    {{ note.project.name }}
                </span>
                <span class="text-[10px] text-text-muted ml-auto">{{ formattedDate }}</span>
            </div>
        </div>
    </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Note } from '../../types/Note';

const props = defineProps<{ note: Note }>();

const snippet = computed(() => {
    if (!props.note.content) return '';
    return props.note.content.replace(/<[^>]*>/g, '').substring(0, 120);
});

const formattedDate = computed(() => {
    const date = new Date(props.note.updatedAt);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
});
</script>
