<template>
  <div>
    <Breadcrumb :items="breadcrumbItems" />

    <div v-if="projectStore.loading" class="flex justify-center py-6">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>

    <div v-else-if="projectStore.error" class="text-center py-6">
      <p class="text-red-500">{{ projectStore.error }}</p>
    </div>

    <div v-else-if="projectStore.currentProject" class="space-y-4">
      <div class="flex justify-end items-center">
        <div class="flex space-x-2 items-center">
          <Button @click="openCreateThreadModal" class="px-3 py-2 rounded-full text-base">
            +
          </Button>
          <Button @click="createDocument" class="px-3 py-2 rounded-full text-base" title="Create document">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </Button>
          <Button @click="openImportDocumentModal" class="px-3 py-2 rounded-full text-base">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 4v12m0 0l-4-4m4 4l4-4m-8 8h8" />
            </svg>
          </Button>

          <Dropdown :showDots="true">
            <DropdownItem @click="openEditModal">Edit</DropdownItem>
            <DropdownItem @click="confirmDelete" className="text-red-500">Delete</DropdownItem>
          </Dropdown>
        </div>
      </div>

      <FilterBadge v-if="filterActive" :term="filterSummary.term" @clear="clearFilter" />
      <div v-if="selectedFile" class="mt-2 p-2 bg-gray-50 rounded">
        <div class="flex items-center">
          <span v-if="selectedFile" class="text-sm text-gray-600">
            {{ selectedFile.name }}
          </span>
        </div>
      </div>
      <div class="mt-4">
        <p v-if="projectStore.loading" class="text-sm text-gray-500">Loading project description...</p>
        <p v-else-if="!projectStore.currentProject">No project loaded</p>
        <p v-else>{{ projectStore.currentProject.description || 'No description' }}</p>
      </div>

      <div class="space-y-4 mt-6">
        <h3 class="text-xl font-semibold">Threads</h3>
        <div v-if="isLoading" class="flex justify-center py-6">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card v-for="thread in filteredThreads" :key="`t-${thread.id}`" :title="thread.name"
            :description="thread.description" :to="`/thread/${thread.id}`" />

          <div v-if="filteredThreads.length === 0" class="col-span-full text-center py-8 bg-gray-50 rounded-lg">
            <p class="text-gray-500">
              {{ searchTerm && threads.length > 0 ? 'No matching threads found.' : 'No threads found in this project.'
              }}
            </p>
          </div>
        </div>

        <h3 class="text-xl font-semibold mt-6">Documents</h3>
        <div v-if="isDocsLoading" class="flex justify-center py-6">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card v-for="doc in filteredDocuments" :key="`d-${doc.id}`" :title="doc.name" :description="doc.description"
            :to="`/document/${doc.id}`" />

          <div v-if="filteredDocuments.length === 0" class="col-span-full text-center py-8 bg-gray-50 rounded-lg">
            <p class="text-gray-500">
              {{
                searchTerm && projectDocuments.length > 0 ?
                  'No matching documents found.' : 'No documents without thread found in this project.'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal :isOpen="showDeleteDialog" title="Delete Project"
      message="Are you sure you want to delete this project? This action cannot be undone." confirmText="Delete"
      cancelText="Cancel" confirmVariant="danger" @confirm="deleteProjectHandler" @cancel="showDeleteDialog = false" />

    <ProjectEditModal v-model="showEditModal" :project-id="route.params.id" @project:updated="handleProjectUpdated" />

    <ThreadCreateModal v-model="showCreateThreadModal" :project-id="route.params.id"
      @thread:created="handleThreadCreated" />

    <ImportDocumentModal v-model="showImportDocumentModal" :project-id="route.params.id"
      @documents:imported="handleDocumentsImported" />
    <SearchInput :show="showSearch" :value="searchTerm" @search="filterThreadsAndDocuments" @close="showSearch = false"
      placeholder="Search threads and documents..." />
  </div>
</template>

<script setup>
import { useThreadList } from '../services/threads/useThreadList';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useProject } from '../services/projects/useProject';
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Button from '../components/ui/Button.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Dropdown from '../components/ui/Dropdown.vue';
import DropdownItem from '../components/ui/DropdownItem.vue';
import ProjectEditModal from '../components/projects/ProjectEditModal.vue';
import ThreadCreateModal from '../components/threads/ThreadCreateModal.vue';
import ImportDocumentModal from '../components/documents/ImportDocumentModal.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import SearchInput from '../components/search/SearchInput.vue';
import FilterBadge from '../components/search/FilterBadge.vue';
import Card from '../components/ui/Card.vue';
import { useNotification } from '../composables/useNotification';
import { useProjectStore } from '../store/projectStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const { showSearch } = useGlobalKeyboard();
const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const showDeleteDialog = ref(false);
const showEditModal = ref(false);
const showCreateThreadModal = ref(false);
const showImportDocumentModal = ref(false);
const searchTerm = ref('');
const filteredThreads = ref([]);
const filteredDocuments = ref([]);
const displayItems = ref([]);
const selectedFile = ref(null);
const { deleteProject } = useProject();
const { isLoading, threads, loadThreads } = useThreadList();
const { isLoading: isDocsLoading, documents: projectDocuments, loadDocumentsByProject } = useDocumentProjectList();
const notification = useNotification();

const breadcrumbItems = computed(() => {
  return projectStore.currentProject ? [
    { name: projectStore.currentProject.name }
  ] : [];
});

const totalThreadsCount = computed(() => threads.value ? threads.value.length : 0);
const totalUnthreadedDocsCount = computed(() => {
  return (projectDocuments.value || []).filter(d => !d.thread || d.thread === null).length;
});
const filterActive = computed(() => !!(searchTerm.value && String(searchTerm.value).trim().length > 0));
const filterSummary = computed(() => {
  return {
    threadsShown: filteredThreads.value.length,
    threadsTotal: totalThreadsCount.value,
    docsShown: filteredDocuments.value.length,
    docsTotal: totalUnthreadedDocsCount.value,
    term: searchTerm.value
  };
});

const clearFilter = () => {
  searchTerm.value = '';
  filterThreadsAndDocuments('');
};

onMounted(async () => {
  const id = route.params.id;
  if (!id) {
    router.push('/');
    return;
  }

  if (projectStore.currentProject && projectStore.currentProject.id === id) {
    await loadThreads(id);
    await loadDocumentsByProject(id);
    return;
  }

  try {
    await projectStore.loadProject(id);
    if (projectStore.error) {
      notification.error(`Error loading project: ${projectStore.error}`);
      return;
    }

    await loadThreads(id);
    await loadDocumentsByProject(id);

  } catch (err) {
    console.error('Project.vue: Unexpected error during project loading:', err);
    notification.error('Failed to load project data');
  }
});

const openEditModal = () => {
  showEditModal.value = true;
};

const handleProjectUpdated = async () => {
  const id = route.params.id;
  await projectStore.loadProject(id);
};

const confirmDelete = () => {
  showDeleteDialog.value = true;
};

const deleteProjectHandler = async () => {
  const id = route.params.id;
  const success = await deleteProject(id);

  if (success) {
    router.push('/');
  } else {
    showDeleteDialog.value = false;
  }
};

const openImportDocumentModal = () => {
  showImportDocumentModal.value = true;
};

const handleDocumentsImported = async () => {
  notification.success('Documents imported', {
    message: 'Documents were successfully imported',
    duration: 3000
  });
  // Reload documents for the project
  const id = route.params.id;
  await loadDocumentsByProject(id);
};

const openCreateThreadModal = () => {
  showCreateThreadModal.value = true;
};

const createDocument = async () => {
  // navigate to new document page passing the project id via query parameters.
  const id = route.params.id;
  router.push({ path: '/document/new', query: { projectId: id } });
};

const handleThreadCreated = async () => {
  const id = route.params.id;
  loadThreads(id);
};

const searchThreads = (searchTerm) => {
  filterThreadsAndDocuments(searchTerm);
};

const filterThreadsAndDocuments = (term) => {
  // Keep the reactive searchTerm ref updated so other UI elements can read it
  searchTerm.value = term || '';
  const normalized = (term || '').toLowerCase().trim();

  // Filter threads
  if (!normalized) {
    filteredThreads.value = threads.value;
  } else {
    filteredThreads.value = threads.value.filter(thread =>
      (thread.name && thread.name.toLowerCase().includes(normalized)) ||
      (thread.description && thread.description.toLowerCase().includes(normalized))
    );
  }

  // Filter documents and keep only those without thread
  const docs = projectDocuments.value || [];
  const unthreaded = docs.filter(d => !d.thread || d.thread === null);

  if (!normalized) {
    filteredDocuments.value = unthreaded;
  } else {
    filteredDocuments.value = unthreaded.filter(doc =>
      (doc.name && doc.name.toLowerCase().includes(normalized)) ||
      (doc.description && doc.description.toLowerCase().includes(normalized))
    );
  }

  // Combine results into the items we show
  displayItems.value = [];
  filteredThreads.value.forEach(t => displayItems.value.push({
    key: `t-${t.id}`,
    id: t.id,
    title: t.name,
    description: t.description,
    to: `/thread/${t.id}`,
    type: 'thread'
  }));

  filteredDocuments.value.forEach(d => displayItems.value.push({
    key: `d-${d.id}`,
    id: d.id,
    title: d.name,
    description: d.description,
    to: `/document/${d.id}`,
    type: 'document'
  }));
};

watch([threads, projectDocuments, searchTerm], () => {
  filterThreadsAndDocuments(searchTerm.value);
}, { immediate: true });
</script>
