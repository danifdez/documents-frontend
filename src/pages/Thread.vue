<template>
  <div class="bg-white shadow-md rounded p-4">
    <div class="flex justify-between items-center">
      <Breadcrumb :items="breadcrumbItems" />
    </div>

    <div class="space-y-4">
      <div class="flex justify-end items-center space-x-4">
        <Button @click="createNewDocument" class="px-3 py-2 rounded-full text-base">
          +
        </Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      <Card v-for="document in filteredDocuments" :key="document._id" :title="document.name"
        :to="`/document/${document._id}`">
      </Card>

      <div v-if="filteredDocuments.length === 0" class="col-span-full text-center py-8 bg-gray-50 rounded-lg">
        <p class="text-gray-500">No documents found in this thread.</p>
      </div>
    </div>
    <SearchInput :show="showFloatingSearch" @search="handleSearch" placeholder="Search threads..." />
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useDocumentList } from '../services/documents/useDocumentList';
import { useRoute, useRouter } from 'vue-router';
import Button from '../components/ui/Button.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Card from '../components/ui/Card.vue';
import SearchInput from '../components/search/SearchInput.vue';
import { useThread } from '../services/threads/useThread';
import { useProjectStore } from '../store/projectStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const route = useRoute();
const router = useRouter();
const { documents, loadDocuments } = useDocumentList();
const { loadThread } = useThread();
const { showFloatingSearch } = useGlobalKeyboard();
const thread = ref(null);
const projectStore = useProjectStore();
const searchQuery = ref('');

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
      query: { threadId: thread.value._id }
    });
  }
};

const breadcrumbItems = computed(() => {
  const items = [];

  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject._id}`
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
  } catch (error) {
    console.error('Error loading thread/project details:', error);
  }
});
</script>