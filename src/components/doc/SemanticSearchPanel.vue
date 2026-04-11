<template>
  <div class="bg-surface-elevated rounded-xl border border-border h-full flex flex-col">
    <!-- Search input -->
    <div class="p-3 border-b border-border-light">
      <div class="relative">
        <svg
          class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="query" type="text" placeholder="Search related content..."
          class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          @keydown.enter="search" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <div class="flex items-center gap-2 text-text-muted text-xs">
        <div class="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
        Searching...
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!hasSearched" class="flex-1 flex items-center justify-center px-4">
      <div class="text-center">
        <svg class="h-8 w-8 mx-auto text-text-muted/50 mb-2" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p class="text-xs text-text-muted">Search across documents, resources and knowledge in this project</p>
      </div>
    </div>

    <!-- No results -->
    <div v-else-if="results.length === 0" class="flex-1 flex items-center justify-center px-4">
      <p class="text-xs text-text-muted">No results found</p>
    </div>

    <!-- Results -->
    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="result in results" :key="`${result.collection}-${result.id}`"
        class="border-b border-border-light last:border-b-0 px-3 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer group"
        @click="openResult(result)">
        <div class="flex items-start gap-2">
          <div class="flex-shrink-0 mt-0.5">
            <span class="inline-flex items-center justify-center w-5 h-5 rounded"
              :class="collectionStyle(result.collection).bg">
              <svg class="h-3 w-3" :class="collectionStyle(result.collection).text" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" :d="collectionStyle(result.collection).icon" />
              </svg>
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
              {{ result.name }}
            </p>
            <p v-if="result.highlightedContent" class="text-[11px] text-text-muted mt-0.5 line-clamp-2">
              {{ result.highlightedContent }}
            </p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] text-text-muted capitalize">{{ formatCollection(result.collection) }}</span>
              <span v-if="result.score" class="text-[10px] text-text-muted">
                {{ Math.round(result.score * 100) }}% match
              </span>
              <span
                class="text-[10px] px-1 py-0.5 rounded"
                :class="result.source === 'rag' ? 'bg-purple-100 text-purple-600' : 'bg-surface text-text-muted'">
                {{ result.source === 'rag' ? 'Semantic' : 'Keyword' }}
              </span>
            </div>
          </div>
          <!-- Insert button -->
          <button v-if="result.collection === 'docs'" @click.stop="$emit('insert-link', result)"
            class="opacity-0 group-hover:opacity-100 p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-all cursor-pointer flex-shrink-0"
            title="Insert link to this document">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useLookup, type LookupResult } from '../../services/search/useLookup';

defineProps<{
  projectId?: number;
}>();

defineEmits<{
  'insert-link': [result: LookupResult];
}>();

const router = useRouter();
const { results, isLoading, lookup } = useLookup();
const query = ref('');
const hasSearched = ref(false);

const search = async () => {
  const q = query.value.trim();
  if (!q) return;
  hasSearched.value = true;
  await lookup(q);
};

const openResult = (result: LookupResult) => {
  const routes: Record<string, string> = {
    docs: '/document/',
    resources: '/resource/',
    canvases: '/canvas/',
    notes: '/notes',
    datasets: '/dataset/',
    knowledge: '/knowledge/',
    entities: '/entity/',
  };
  const base = routes[result.collection];
  if (base) {
    router.push(base + result.id);
  }
};

const formatCollection = (c: string) => {
  const map: Record<string, string> = {
    docs: 'Document',
    resources: 'Resource',
    canvases: 'Canvas',
    notes: 'Note',
    datasets: 'Dataset',
    knowledge: 'Knowledge',
    entities: 'Entity',
    events: 'Event',
  };
  return map[c] || c;
};

const collectionStyle = (c: string) => {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    docs: {
      bg: 'bg-accent-subtle',
      text: 'text-accent',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    resources: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    },
    canvases: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z',
    },
    knowledge: {
      bg: 'bg-amber-100',
      text: 'text-amber-600',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    },
    entities: {
      bg: 'bg-teal-100',
      text: 'text-teal-600',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    },
  };
  return styles[c] || { bg: 'bg-surface', text: 'text-text-muted', icon: 'M4 6h16M4 12h16M4 18h16' };
};
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
