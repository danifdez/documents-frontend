<template>
  <div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <Card v-for="project in projects" :key="project.id" :title="project.name" :description="project.description"
        :to="`/project/${project.id}`" />
    </div>

    <!-- Empty state -->
    <EmptyState v-if="projects.length === 0" icon="folder"
      :title="searchTerm ? 'No results found' : 'No projects yet'"
      :description="searchTerm ? `No projects match &quot;${searchTerm}&quot;` : 'Create your first project to get started'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useProjectList } from '../../services/projects/useProjectList';
import Card from '../ui/Card.vue';
import EmptyState from '../ui/EmptyState.vue';

const props = defineProps({
  searchTerm: {
    type: String,
    default: ''
  }
});

const { projects, loadProjects, searchProjects } = useProjectList();

watch(() => props.searchTerm, (newSearchTerm) => {
  if (newSearchTerm) {
    searchProjects(newSearchTerm);
  } else {
    loadProjects();
  }
});

onMounted(async () => {
  await loadProjects();
});

const filterProjects = async (term: string) => {
  if (term && term.trim() !== '') {
    await searchProjects(term);
  } else {
    await loadProjects();
  }
};

defineExpose({
  loadProjects,
  filterProjects
});
</script>
