<template>
  <div>
    <Breadcrumb :items="breadcrumbItems" />
    <div class="mb-6 flex justify-end items-center space-x-3">
      <Button @click="openProjectModal" class="px-3 py-2 rounded-full text-base">
        +
      </Button>
    </div>
    <ProjectList ref="projectsComponent" :search-term="searchTerm" />

    <ProjectAddModal v-model="showProjectModal" @project:created="onNewProject" />
    <SearchInput :show="showSearch" @search="searchProjects" @close="showSearch = false"
      placeholder="Search projects..." />
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

const { showSearch } = useGlobalKeyboard();

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