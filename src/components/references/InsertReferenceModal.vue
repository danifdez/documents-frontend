<template>
    <Modal v-model="isOpen" title="Insert reference" wide>
        <div class="flex flex-col gap-3" style="min-height: 480px;">
            <!-- Filter tabs -->
            <div class="flex gap-1 flex-wrap border-b border-border pb-2 px-4 pt-4">
                <button v-for="tab in visibleTabs" :key="tab.value"
                    @click="activeTab = tab.value"
                    :class="activeTab === tab.value ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                    class="px-3 py-1.5 text-xs rounded font-medium">
                    {{ tab.label }}
                </button>
            </div>

            <!-- Search -->
            <div class="px-4">
                <input type="text" v-model="searchQuery"
                    placeholder="Search..."
                    class="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                    autofocus />
            </div>

            <!-- Results -->
            <div class="flex-1 overflow-y-auto max-h-[60vh] px-4 pb-4">
                <div v-if="isSearching" class="text-center py-8 text-text-muted text-sm">Searching...</div>
                <div v-else-if="searchQuery.length > 0 && searchQuery.length < 2" class="text-center py-8 text-text-muted text-sm">
                    Type at least 2 characters.
                </div>
                <div v-else-if="results.length === 0 && searchQuery.length >= 2" class="text-center py-8 text-text-muted text-sm">
                    No results found.
                </div>
                <div v-else-if="results.length === 0" class="text-center py-8 text-text-muted text-sm">
                    Search to insert a reference.
                </div>
                <ul v-else class="space-y-1">
                    <li v-for="item in results" :key="`${item.type}-${item.id}`"
                        class="p-2.5 hover:bg-surface-hover cursor-pointer rounded-md flex items-start gap-2"
                        @click="selectItem(item)">
                        <span class="text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5" :style="badgeStyle(item.type)">
                            {{ typeLabels[item.type] || item.type }}
                        </span>
                        <div class="min-w-0 flex-1">
                            <p class="text-sm font-medium truncate">{{ item.name }}</p>
                            <p v-if="item.meta?.year || item.meta?.creators" class="text-xs text-text-muted mt-0.5 truncate">
                                <template v-if="item.meta?.creators">{{ formatCreatorsShort(item.meta.creators) }}</template>
                                <template v-if="item.meta?.year"> · {{ item.meta.year }}</template>
                                <template v-if="item.meta?.journal"> · {{ item.meta.journal }}</template>
                            </p>
                            <p v-else-if="item.content" class="text-xs text-text-muted mt-0.5 line-clamp-1">{{ item.content }}</p>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
    </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
import apiClient from '../../services/api';
import type { BibliographyEntry, ZoteroCreator } from '../../types/Bibliography';
import { formatInlineCitation, type CitationStyle } from '../../services/citations/citationFormatter';

interface SearchResult {
    id: string;
    type: 'bibliography' | 'resource' | 'doc' | 'mark' | 'knowledge';
    name: string;
    content?: string;
    meta?: Record<string, any>;
}

const props = defineProps<{
    modelValue: boolean;
    entries: BibliographyEntry[];
    citationStyle: CitationStyle;
    existingRefIds: string[];
    context: string;
    projectId?: number;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    'select': [item: { refId: string; refType: string; label: string; displayMode: string }];
}>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
});

type TabValue = 'all' | 'bibliography' | 'resource' | 'doc' | 'mark' | 'knowledge';

const tabs: { value: TabValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'bibliography', label: 'Bibliography' },
    { value: 'resource', label: 'Resources' },
    { value: 'doc', label: 'Documents' },
    { value: 'mark', label: 'Marks' },
    { value: 'knowledge', label: 'KB' },
];

const visibleTabs = computed(() => {
    if (props.context === 'knowledge') {
        return tabs.filter(t => t.value !== 'doc');
    }
    return tabs;
});

const activeTab = ref<TabValue>('all');
const searchQuery = ref('');
const apiResults = ref<SearchResult[]>([]);
const isSearching = ref(false);
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const typeLabels: Record<string, string> = {
    bibliography: 'Bib',
    resource: 'Resource',
    doc: 'Doc',
    mark: 'Mark',
    knowledge: 'KB',
};

const TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
    bibliography: { bg: '#dbeafe', fg: '#1d4ed8' },
    resource: { bg: '#e0e7ff', fg: '#3730a3' },
    doc: { bg: '#d1fae5', fg: '#065f46' },
    mark: { bg: '#fef3c7', fg: '#92400e' },
    knowledge: { bg: '#ede9fe', fg: '#5b21b6' },
};

const badgeStyle = (type: string) => {
    const c = TYPE_COLORS[type] || TYPE_COLORS.resource;
    return { background: c.bg, color: c.fg };
};

// Reset on open
watch(() => props.modelValue, (open) => {
    if (open) {
        searchQuery.value = '';
        apiResults.value = [];
        activeTab.value = 'all';
    }
});

// Search logic
const doSearch = async () => {
    if (searchQuery.value.length < 2) {
        apiResults.value = [];
        return;
    }
    isSearching.value = true;
    try {
        const typeParam = activeTab.value === 'all' ? '' : activeTab.value;
        const response = await apiClient.get('/reference/search', {
            params: {
                q: searchQuery.value,
                ...(typeParam ? { type: typeParam } : {}),
            },
        });
        apiResults.value = response.data;
    } catch {
        apiResults.value = [];
    } finally {
        isSearching.value = false;
    }
};

watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 400);
});

watch(activeTab, () => {
    if (searchQuery.value.length >= 2) doSearch();
});

// Filtered results (merge API results; bibliography also from local entries if tab matches)
const results = computed<SearchResult[]>(() => {
    let merged = [...apiResults.value];

    // For bibliography tab or 'all', also include client-side filtered entries
    if (activeTab.value === 'all' || activeTab.value === 'bibliography') {
        const q = searchQuery.value.toLowerCase();
        if (q.length >= 2) {
            const apiIds = new Set(merged.filter(r => r.type === 'bibliography').map(r => r.id));
            const localMatches = props.entries
                .filter(e => !apiIds.has(String(e.id)))
                .filter(e =>
                    e.title?.toLowerCase().includes(q) ||
                    e.citeKey?.toLowerCase().includes(q) ||
                    e.creators?.some(c => creatorDisplayName(c).toLowerCase().includes(q)) ||
                    e.year?.includes(q)
                )
                .map(e => ({
                    id: String(e.id),
                    type: 'bibliography' as const,
                    name: e.title || e.citeKey || 'Untitled',
                    meta: {
                        year: e.year,
                        creators: e.creators,
                        journal: e.journal,
                        publisher: e.publisher,
                    },
                }));
            merged = [...merged, ...localMatches];
        }
    }

    // Filter by tab
    if (activeTab.value !== 'all') {
        merged = merged.filter(r => r.type === activeTab.value);
    }

    return merged;
});

const creatorDisplayName = (c: ZoteroCreator): string => {
    if (c.name) return c.name;
    if (c.lastName && c.firstName) return `${c.lastName}, ${c.firstName}`;
    return c.lastName ?? c.firstName ?? '';
};

const formatCreatorsShort = (creators: ZoteroCreator[] | null): string => {
    const authors = (creators ?? []).filter(c => c.creatorType === 'author');
    if (authors.length === 0) return '';
    if (authors.length === 1) return creatorDisplayName(authors[0]);
    if (authors.length === 2) return `${creatorDisplayName(authors[0])} & ${creatorDisplayName(authors[1])}`;
    return creatorDisplayName(authors[0]) + ' et al.';
};

// Build label for the item
const buildLabel = (item: SearchResult): string => {
    if (item.type === 'bibliography') {
        // Try local entries first, fallback to building from search meta
        let entry = props.entries.find(e => String(e.id) === item.id);
        if (!entry && item.meta) {
            entry = {
                id: Number(item.id),
                title: item.name,
                creators: item.meta.creators ?? null,
                year: item.meta.year ?? null,
                citeKey: null,
                entryType: item.meta.entryType ?? 'misc',
            } as BibliographyEntry;
        }
        if (entry) {
            const bibIndex = props.existingRefIds.includes(item.id)
                ? props.existingRefIds.indexOf(item.id) + 1
                : props.existingRefIds.length + 1;
            return formatInlineCitation(entry, props.citationStyle, bibIndex);
        }
        return item.name;
    }
    if (item.type === 'mark') {
        return item.content || item.name;
    }
    return item.name;
};

const defaultDisplayMode = (type: string): string => {
    if (type === 'mark') return 'quote-citation';
    return 'citation';
};

const selectItem = (item: SearchResult) => {
    emit('select', {
        refId: item.id,
        refType: item.type,
        label: buildLabel(item),
        displayMode: defaultDisplayMode(item.type),
    });
    isOpen.value = false;
};
</script>
