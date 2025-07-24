<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card v-for="project in projects" :key="project._id" :title="project.name" :description="project.description"
      :to="`/project/${project._id}`" />

    <div v-if="projects.length === 0" class="col-span-full flex justify-center p-8">
      <div class="text-center text-gray-500">
        <p class="text-lg" v-if="searchTerm">No projects found matching "{{ searchTerm }}"</p>
        <p class="text-lg" v-else>No projects created yet</p>
        <p class="text-sm mt-1" v-if="!searchTerm">Create your first project using the button above</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useProjectList } from '../../services/projects/useProjectList';
import Card from '../ui/Card.vue';

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