<template>
  <div class="h-full overflow-y-auto">
    <div class="px-6 py-6">
      <PageHeader :breadcrumbs="breadcrumbItems">
        <template #title>
          <FilterBadge v-if="filterActive" :term="searchQuery" @clear="clearFilter" />
        </template>
        <template #actions>
          <OfflineToggle v-if="threadId" type="thread" :id="Number(threadId)" />
          <button @click="createNewDocument"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clip-rule="evenodd" />
            </svg>
            <span>New Document</span>
          </button>
          <button @click="createNewCanvas"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            <span>New Canvas</span>
          </button>
        </template>
      </PageHeader>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="item in allItems" :key="item.key" :title="item.name" :to="item.to" :variant="item.type">
          <template #icon>
            <!-- Document icon -->
            <svg v-if="item.type === 'document'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <!-- Canvas icon -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </template>
        </Card>
      </div>

      <EmptyState v-if="allItems.length === 0" icon="document"
        title="No documents or canvases found in this thread." />

      <SearchInput :show="showSearch" :value="searchQuery" @search="handleSearch" @close="showSearch = false"
        placeholder="Search documents..." />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useDocumentList } from '../services/documents/useDocumentList';
import { useCanvasList } from '../services/canvas/useCanvasList';
import { useRoute, useRouter } from 'vue-router';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import Card from '../components/ui/Card.vue';
import OfflineToggle from '../components/OfflineToggle.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SearchInput from '../components/search/SearchInput.vue';
import FilterBadge from '../components/search/FilterBadge.vue';
import { useThread } from '../services/threads/useThread';
import { useProjectStore } from '../store/projectStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const route = useRoute();
const router = useRouter();
const { documents, loadDocuments } = useDocumentList();
const { canvases, loadCanvasesByThread } = useCanvasList();
const { loadThread } = useThread();
const { showSearch } = useGlobalKeyboard();
const thread = ref(null);
const projectStore = useProjectStore();
const searchQuery = ref('');
const filterActive = computed(() => !!(searchQuery.value && String(searchQuery.value).trim().length > 0));

const clearFilter = () => {
  searchQuery.value = '';
};

const filteredDocuments = computed(() => {
  if (!searchQuery.value.trim()) {
    return documents.value;
  }

  const query = searchQuery.value.toLowerCase();
  return documents.value.filter(doc =>
    doc.name.toLowerCase().includes(query)
  );
});

const handleSearch = (query) => {
  searchQuery.value = query;
};

const createNewDocument = () => {
  if (thread.value) {
    router.push({
      path: '/document/new',
      query: { threadId: thread.value.id }
    });
  }
};

const createNewCanvas = () => {
  if (thread.value) {
    router.push({
      path: '/canvas/new',
      query: { threadId: thread.value.id }
    });
  }
};

const filteredCanvases = computed(() => {
  if (!searchQuery.value.trim()) {
    return canvases.value;
  }
  const query = searchQuery.value.toLowerCase();
  return canvases.value.filter(c =>
    c.name.toLowerCase().includes(query)
  );
});

const allItems = computed(() => {
  const docs = filteredDocuments.value.map(d => ({
    key: `d-${d.id}`,
    name: d.name,
    to: `/document/${d.id}`,
    type: 'document',
    updatedAt: d.updatedAt || d.createdAt,
  }));
  const cvs = filteredCanvases.value.map(c => ({
    key: `c-${c.id}`,
    name: c.name,
    to: `/canvas/${c.id}`,
    type: 'canvas',
    updatedAt: c.updatedAt || c.createdAt,
  }));
  return [...docs, ...cvs].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
});

const breadcrumbItems = computed(() => {
  const items = [];

  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject.id}`
  });

  if (thread.value) {
    items.push({
      name: thread.value.name
    });
  }

  return items;
});

onMounted(async () => {
  const threadId = route.params.id;

  try {
    thread.value = await loadThread(threadId);
    await loadDocuments(threadId);
    await loadCanvasesByThread(threadId);
  } catch (error) {
    console.error('Error loading thread/project details:', error);
  }
});
</script>
