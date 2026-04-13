<template>
    <Teleport to="body">
        <!-- Floating popup -->
        <div v-if="visible" ref="popupRef"
            class="fixed z-50 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden"
            :style="{ top: `${pos.y}px`, left: `${pos.x}px`, minWidth: '280px', maxWidth: '380px' }"
            @mousedown.stop>

            <!-- Selected term -->
            <div class="px-3 py-2 border-b border-border bg-surface">
                <p class="text-xs text-text-muted truncate">
                    <span class="font-medium text-text-primary">"{{ selectedText }}"</span>
                </p>
            </div>

            <!-- Action buttons -->
            <div class="flex border-b border-border">
                <button @click="searchInKB"
                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    :class="{ 'text-accent bg-accent-subtle': activeTab === 'kb' }">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Search in KB
                </button>
                <div class="w-px bg-border"></div>
                <button @click="searchInWikipedia"
                    class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                    :class="{ 'text-accent bg-accent-subtle': activeTab === 'wiki' }">
                    <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Wikipedia
                </button>
            </div>

            <!-- Results panel -->
            <div class="max-h-72 overflow-y-auto">
                <!-- Loading -->
                <div v-if="loading" class="flex items-center justify-center py-6">
                    <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                </div>

                <!-- KB results -->
                <template v-else-if="activeTab === 'kb'">
                    <div v-if="kbResults.length === 0" class="px-4 py-5 text-center">
                        <p class="text-xs text-text-muted">No Knowledge Base entries found</p>
                        <button @click="createKBEntry"
                            class="mt-2 text-xs text-accent hover:underline cursor-pointer">
                            Create new entry with this term
                        </button>
                    </div>
                    <div v-for="entry in kbResults" :key="entry.id" @click="goToEntry(entry.id)"
                        class="px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-surface transition-colors">
                        <p class="text-xs font-medium text-text-primary line-clamp-1">{{ entry.title }}</p>
                        <p v-if="entry.summary" class="text-xs text-text-muted mt-0.5 line-clamp-2">{{ entry.summary }}</p>
                    </div>
                </template>

                <!-- Wikipedia result -->
                <template v-else-if="activeTab === 'wiki'">
                    <div v-if="wikiError" class="px-4 py-5 text-center">
                        <p class="text-xs text-text-muted">{{ wikiError }}</p>
                    </div>
                    <div v-else-if="wikiResult" class="px-4 py-4">
                        <div class="flex gap-3">
                            <img v-if="wikiResult.thumbnail" :src="wikiResult.thumbnail" alt=""
                                class="w-12 h-12 rounded object-cover shrink-0" />
                            <div class="min-w-0">
                                <p class="text-xs font-semibold text-text-primary mb-1">{{ wikiResult.title }}</p>
                                <p class="text-xs text-text-secondary line-clamp-5 leading-relaxed">{{ wikiResult.extract }}</p>
                            </div>
                        </div>
                        <a :href="wikiResult.url" target="_blank" rel="noopener"
                            class="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline">
                            View on Wikipedia
                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </template>
            </div>

        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useKnowledgeBase } from '../../services/knowledge/useKnowledgeBase';
import { useWikipedia } from '../../services/knowledge/useWikipedia';
import type { KnowledgeEntry } from '../../services/knowledge/useKnowledgeBase';

const router = useRouter();
const route = useRoute();

const isAllowedRoute = () => {
    return route.path.startsWith('/document/');
};
const { loadEntries, createEntry } = useKnowledgeBase();
const { search: searchWiki } = useWikipedia();

const visible = ref(false);
const selectedText = ref('');
const pos = ref({ x: 0, y: 0 });
const popupRef = ref<HTMLElement | null>(null);
const activeTab = ref<'kb' | 'wiki' | null>(null);
const loading = ref(false);
const kbResults = ref<KnowledgeEntry[]>([]);
const wikiResult = ref<any>(null);
const wikiError = ref<string | null>(null);

const hide = () => {
    visible.value = false;
    activeTab.value = null;
    kbResults.value = [];
    wikiResult.value = null;
    wikiError.value = null;
};

const onContextMenu = (e: MouseEvent) => {
    // Only activate on document or resource pages
    if (!isAllowedRoute()) return;

    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? '';

    if (!text || text.length < 2) return;

    // Prevent default browser context menu
    e.preventDefault();

    selectedText.value = text.length > 80 ? text.slice(0, 80) + '…' : text;

    // Position popup at cursor
    const popupWidth = 320;
    const margin = 8;

    let x = e.clientX;
    let y = e.clientY + margin;

    // Keep within viewport
    x = Math.max(margin, Math.min(x, window.innerWidth - popupWidth - margin));

    pos.value = { x, y };
    activeTab.value = null;
    kbResults.value = [];
    wikiResult.value = null;
    wikiError.value = null;
    visible.value = true;
};

const onMouseDown = (e: MouseEvent) => {
    if (popupRef.value && !popupRef.value.contains(e.target as Node)) {
        hide();
    }
};

const searchInKB = async () => {
    activeTab.value = 'kb';
    loading.value = true;
    try {
        const results = await loadEntries(selectedText.value.replace('…', '').trim());
        kbResults.value = results ?? [];
    } finally {
        loading.value = false;
    }
};

const searchInWikipedia = async () => {
    activeTab.value = 'wiki';
    wikiResult.value = null;
    wikiError.value = null;
    loading.value = true;
    try {
        const result = await searchWiki(selectedText.value.replace('…', '').trim());
        if (result) {
            wikiResult.value = result;
        } else {
            wikiError.value = 'Article not found on Wikipedia';
        }
    } finally {
        loading.value = false;
    }
};

const goToEntry = (id: number) => {
    hide();
    router.push(`/knowledge-base/${id}`);
};

const createKBEntry = async () => {
    hide();
    try {
        const entry = await createEntry({ title: selectedText.value.replace('…', '').trim() });
        router.push(`/knowledge-base/${entry.id}`);
    } catch (err) {
        console.error('Error creating entry:', err);
    }
};

onMounted(() => {
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('mousedown', onMouseDown);
});

onUnmounted(() => {
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('mousedown', onMouseDown);
});
</script>
