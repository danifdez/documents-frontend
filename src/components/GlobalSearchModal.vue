<template>
    <Teleport to="body">
        <Transition name="search-overlay">
            <div v-if="show" class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm"
                @mousedown.self="close">
                <Transition name="search-panel" appear>
                    <div v-if="show" class="mt-[5vh] w-full max-w-3xl px-4 max-h-[90vh] flex flex-col">
                        <div
                            class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border overflow-hidden flex flex-col max-h-[85vh]">
                            <!-- Search input -->
                            <div class="flex items-center px-6 gap-3 shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-text-muted shrink-0"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                                    <path stroke-linecap="round" stroke-linejoin="round"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input v-model="term" ref="inputRef"
                                    class="flex-1 py-4 text-base bg-transparent border-0 outline-none text-text-primary placeholder:text-text-muted"
                                    type="text" :placeholder="searchPlaceholder" />
                                <div v-if="loading"
                                    class="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent">
                                </div>
                                <span v-if="term && !loading && results.length > 0"
                                    class="text-xs text-text-muted shrink-0">
                                    {{ results.length }} result{{ results.length !== 1 ? 's' : '' }}
                                </span>
                            </div>

                            <!-- Results -->
                            <div v-if="term" class="border-t border-border-light overflow-y-auto flex-1 min-h-0">
                                <div v-if="!loading && results.length === 0" class="px-6 py-16 text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg"
                                        class="h-10 w-10 mx-auto text-text-muted/40 mb-3" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <p class="text-sm text-text-muted">No results found for "<strong>{{ term
                                            }}</strong>"</p>
                                </div>

                                <!-- Grouped results -->
                                <div v-else>
                                    <div v-for="group in groupedResults" :key="group.collection" class="py-2">
                                        <div
                                            class="px-6 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted sticky top-0 bg-surface-elevated/95 backdrop-blur-sm z-10">
                                            {{ collectionLabel(group.collection) }}
                                            <span class="text-text-muted/60 ml-1">{{ group.items.length }}</span>
                                        </div>
                                        <router-link v-for="(result, i) in group.items" :key="`${result.collection}-${result.id}-${i}`"
                                            :to="getResultLink(result)"
                                            class="flex items-start gap-3 px-6 py-3 hover:bg-surface-hover transition-colors group"
                                            @click.native="close">
                                            <!-- Icon -->
                                            <div
                                                class="shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center"
                                                :class="collectionIconBg(result.collection)">
                                                <component :is="'span'"
                                                    class="text-xs" v-html="collectionIcon(result.collection)" />
                                            </div>
                                            <!-- Content -->
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-baseline gap-2">
                                                    <span v-if="result.highlightedName"
                                                        class="font-medium text-sm text-text-primary truncate"
                                                        v-html="result.highlightedName"></span>
                                                    <span v-else-if="result.highlightedTitle"
                                                        class="font-medium text-sm text-text-primary truncate"
                                                        v-html="result.highlightedTitle"></span>
                                                </div>
                                                <p v-if="result.highlightedContent"
                                                    class="mt-0.5 text-xs text-text-secondary line-clamp-2 leading-relaxed"
                                                    v-html="result.highlightedContent"></p>
                                            </div>
                                            <!-- Arrow -->
                                            <svg xmlns="http://www.w3.org/2000/svg"
                                                class="h-4 w-4 shrink-0 mt-1 text-text-muted/0 group-hover:text-text-muted transition-colors"
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                stroke-width="1.75">
                                                <path stroke-linecap="round" stroke-linejoin="round"
                                                    d="M9 5l7 7-7 7" />
                                            </svg>
                                        </router-link>
                                    </div>
                                </div>
                            </div>

                            <!-- Footer -->
                            <div
                                class="border-t border-border-light px-6 py-2.5 flex items-center justify-between gap-3 shrink-0">
                                <span v-if="projectStore.currentProject"
                                    class="inline-flex items-center gap-1.5 text-xs text-accent">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    {{ projectStore.currentProject.name }}
                                </span>
                                <span v-else class="inline-flex items-center gap-1.5 text-xs text-text-muted">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    Global search
                                </span>
                                <span class="text-xs text-text-muted">
                                    <kbd
                                        class="px-1.5 py-0.5 bg-surface rounded text-[11px] font-medium border border-border">Esc</kbd>
                                    to close
                                </span>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import apiClient from '../services/api';
import { useProjectStore } from '../store/projectStore';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close']);
const projectStore = useProjectStore();

const term = ref('');
const results = ref<any[]>([]);
const loading = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

const searchPlaceholder = computed(() => {
    if (projectStore.currentProject) {
        return `Search in ${projectStore.currentProject.name}...`;
    }
    return 'Search notes, events, knowledge base, entities, datasets...';
});

const collectionLabels: Record<string, string> = {
    docs: 'Documents',
    resources: 'Resources',
    canvases: 'Canvases',
    notes: 'Notes',
    events: 'Events',
    knowledge: 'Knowledge Base',
    entities: 'Entities',
    datasets: 'Datasets',
};

function collectionLabel(collection: string): string {
    return collectionLabels[collection] || collection;
}

const collectionIcons: Record<string, string> = {
    docs: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>`,
    resources: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>`,
    canvases: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>`,
    notes: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>`,
    events: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
    knowledge: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`,
    entities: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>`,
    datasets: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>`,
};

const collectionIconBgs: Record<string, string> = {
    docs: 'bg-blue-500/10 text-blue-500',
    resources: 'bg-emerald-500/10 text-emerald-500',
    canvases: 'bg-violet-500/10 text-violet-500',
    notes: 'bg-amber-500/10 text-amber-500',
    events: 'bg-rose-500/10 text-rose-500',
    knowledge: 'bg-cyan-500/10 text-cyan-500',
    entities: 'bg-orange-500/10 text-orange-500',
    datasets: 'bg-indigo-500/10 text-indigo-500',
};

function collectionIcon(collection: string): string {
    return collectionIcons[collection] || '';
}

function collectionIconBg(collection: string): string {
    return collectionIconBgs[collection] || 'bg-surface text-text-muted';
}

const groupedResults = computed(() => {
    const groups: Record<string, { collection: string; items: any[] }> = {};
    for (const result of results.value) {
        if (!groups[result.collection]) {
            groups[result.collection] = { collection: result.collection, items: [] };
        }
        groups[result.collection].items.push(result);
    }
    return Object.values(groups);
});

async function performSearch() {
    if (!term.value) return;
    loading.value = true;
    try {
        const payload: any = { term: term.value };
        if (projectStore.currentProject) {
            payload.projectId = projectStore.currentProject.id;
        }
        const res = await apiClient.post('/search', payload);
        results.value = res.data;
    } catch (e) {
        results.value = [];
    } finally {
        loading.value = false;
    }
}

function getResultLink(result: any) {
    switch (result.collection) {
        case 'docs':
            return `/document/${result.id}`;
        case 'resources':
            return `/resource/${result.id}`;
        case 'canvases':
            return `/canvas/${result.id}`;
        case 'notes':
            return `/notes/${result.id}`;
        case 'events':
            return `/calendar`;
        case 'knowledge':
            return `/knowledge-base/${result.id}`;
        case 'entities':
            return `/entities`;
        case 'datasets':
            return `/datasets/${result.id}`;
        default:
            return '#';
    }
}

function close() {
    emit('close');
}

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 300;

watch(term, () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        performSearch();
    }, DEBOUNCE_DELAY);
});

watch(
    () => props.show,
    (val) => {
        if (val) {
            setTimeout(() => {
                inputRef.value?.focus();
            }, 0);
        } else {
            term.value = '';
            results.value = [];
        }
    }
);
</script>

<style scoped>
.search-overlay-enter-active,
.search-overlay-leave-active {
    transition: opacity 0.2s ease;
}

.search-overlay-enter-from,
.search-overlay-leave-to {
    opacity: 0;
}

.search-panel-enter-active {
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.search-panel-leave-active {
    transition: all 0.15s ease-in;
}

.search-panel-enter-from {
    opacity: 0;
    transform: translateY(-12px) scale(0.97);
}

.search-panel-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
}
</style>
