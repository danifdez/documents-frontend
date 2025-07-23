<template>
  <div>
    <Breadcrumb :items="breadcrumbItems" />
    <div class="mb-6 flex justify-end items-center space-x-3">
      <Button @click="openProjectModal" class="bg-blue-500 hover:bg-blue-600">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clip-rule="evenodd" />
          </svg>
          Add Project
        </div>
      </Button>
    </div>
    <ProjectList ref="projectsComponent" :search-term="searchTerm" />

    <ProjectAddModal v-model="showProjectModal" @project:created="onNewProject" />
    <SearchInput :show="showFloatingSearch" @search="searchProjects" placeholder="Search projects..." />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ProjectList from '../components/projects/ProjectList.vue';
import ProjectAddModal from '../components/projects/ProjectAddModal.vue';
import SearchInput from '../components/search/SearchInput.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Button from '../components/ui/Button.vue';
import { useProjectStore } from '../store/projectStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const projectsComponent = ref(null);
const showProjectModal = ref(false);
const searchTerm = ref('');
const projectStore = useProjectStore();

const { showFloatingSearch } = useGlobalKeyboard();

const breadcrumbItems = computed(() => {
  return [];
});

const openProjectModal = () => {
  showProjectModal.value = true;
};

const onNewProject = () => {
  if (projectsComponent.value && projectsComponent.value.loadProjects) {
    projectsComponent.value.loadProjects();
  }
};

const searchProjects = (searchTerm) => {
  if (projectsComponent.value && projectsComponent.value.loadProjects) {
    projectsComponent.value.filterProjects(searchTerm);
  }
};

onMounted(() => {
  projectStore.clearCurrentProject();
});
</script>