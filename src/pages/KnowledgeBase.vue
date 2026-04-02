<template>
    <div class="h-full flex flex-col overflow-hidden">
        <div class="px-6 py-5 shrink-0">
            <PageHeader title="Knowledge Base" subtitle="Notas y conceptos de referencia personal">
                <template #actions>
                    <button @click="createNewEntry" class="btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd"
                                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                                clip-rule="evenodd" />
                        </svg>
                        <span>Nueva entrada</span>
                    </button>
                </template>
            </PageHeader>

            <div class="flex items-center gap-3">
                <div class="flex-1 max-w-md">
                    <SearchBar v-model="searchQuery" placeholder="Buscar entradas..." />
                </div>
                <span v-if="entries.length > 0" class="text-xs text-text-muted">{{ filteredItems.length }} entradas</span>
            </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <LoadingSpinner v-if="isLoading" size="lg" fullHeight />

            <EmptyState v-else-if="entries.length === 0" icon="default"
                title="Sin entradas todavía" description="Crea una entrada para comenzar tu base de conocimiento" />

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                <div v-for="entry in filteredItems" :key="entry.id"
                    @click="router.push(`/knowledge-base/${entry.id}`)"
                    class="group bg-surface-elevated border border-border rounded-xl p-4 cursor-pointer hover:border-accent/40 hover:shadow-sm transition-all duration-200">
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <h3 class="text-sm font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                            {{ entry.title }}
                        </h3>
                        <span v-if="entry.isDefinition"
                            class="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-violet-100 text-violet-700"
                            title="Definición">Def</span>
                    </div>
                    <p v-if="entry.summary" class="text-xs text-text-muted line-clamp-3 mb-3">{{ entry.summary }}</p>
                    <div v-if="entry.tags && entry.tags.length" class="flex flex-wrap gap-1">
                        <Badge v-for="tag in entry.tags.slice(0, 4)" :key="tag" variant="accent">{{ tag }}</Badge>
                    </div>
                    <p class="text-[11px] text-text-muted mt-2">{{ formatDate(entry.updatedAt) }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useKnowledgeBase } from '../services/knowledge/useKnowledgeBase';
import { usePageFilter } from '../composables/usePageFilter';
import PageHeader from '../components/ui/PageHeader.vue';
import SearchBar from '../components/ui/SearchBar.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import Badge from '../components/ui/Badge.vue';

const router = useRouter();
const { entries, isLoading, loadEntries, createEntry } = useKnowledgeBase();
const { searchQuery, filteredItems } = usePageFilter(entries, ['title', 'summary']);

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
};

const createNewEntry = async () => {
    try {
        const entry = await createEntry({ title: 'Nueva entrada' });
        router.push(`/knowledge-base/${entry.id}`);
    } catch (err) {
        console.error('Error creating entry:', err);
    }
};

onMounted(() => {
    loadEntries();
});
</script>
