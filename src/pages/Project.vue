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
          <Card v-for="thread in filteredThreads" :key="thread._id" :title="thread.name"
            :description="thread.description" :to="`/thread/${thread._id}`" />

          <div v-if="filteredThreads.length === 0" class="col-span-full text-center py-8 bg-gray-50 rounded-lg">
            <p class="text-gray-500">
              {{
                searchTerm && threads.length > 0 ? 'No matching threads found.' : 'No threads found in this project.'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDeleteDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-10">
      <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 class="text-lg font-bold mb-4">Delete Project</h3>
        <p>Are you sure you want to delete this project? This action cannot be undone.</p>
        <div class="flex justify-end mt-6 space-x-2">
          <Button @click="showDeleteDialog = false">
            Cancel
          </Button>
          <Button @click="deleteProjectHandler">
            Delete
          </Button>
        </div>
      </div>
    </div>

    <ProjectEditModal v-model="showEditModal" :project-id="route.params.id" @project:updated="handleProjectUpdated" />

    <ThreadCreateModal v-model="showCreateThreadModal" :project-id="route.params.id"
      @thread:created="handleThreadCreated" />

    <ImportDocumentModal v-model="showImportDocumentModal" :project-id="route.params.id"
      @documents:imported="handleDocumentsImported" />
    <SearchInput :show="showSearch" @search="searchThreads" @close="showSearch = false"
      placeholder="Search threads..." />
  </div>
</template>

<script setup>
import { useThreadList } from '../services/threads/useThreadList';
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
import SearchInput from '../components/search/SearchInput.vue';
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
const selectedFile = ref(null);
const { deleteProject } = useProject();
const { isLoading, threads, loadThreads } = useThreadList();
const notification = useNotification();

const breadcrumbItems = computed(() => {
  return projectStore.currentProject ? [
    { name: projectStore.currentProject.name }
  ] : [];
});

onMounted(async () => {
  const id = route.params.id;
  if (!id) {
    router.push('/');
    return;
  }

  if (projectStore.currentProject && projectStore.currentProject._id === id) {
    await loadThreads(id);
    return;
  }

  try {
    await projectStore.loadProject(id);
    if (projectStore.error) {
      notification.error(`Error loading project: ${projectStore.error}`);
      return;
    }

    await loadThreads(id);

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
};

const openCreateThreadModal = () => {
  showCreateThreadModal.value = true;
};

const handleThreadCreated = async () => {
  const id = route.params.id;
  loadThreads(id);
};

const searchThreads = (searchTerm) => {
  filterThreads(searchTerm);
};

const filterThreads = (searchTerm) => {
  if (!searchTerm) {
    filteredThreads.value = threads.value;
    return;
  }

  const term = searchTerm.toLowerCase().trim();
  filteredThreads.value = threads.value.filter(thread =>
    thread.name.toLowerCase().includes(term) ||
    (thread.description && thread.description.toLowerCase().includes(term))
  );
};

watch([threads, searchTerm], () => {
  filterThreads();
}, { immediate: true });
</script>
