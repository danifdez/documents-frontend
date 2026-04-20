<template>
  <div>
    <div class="flex justify-end mb-3">
      <label class="inline-flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
        <input type="checkbox" v-model="includeArchived" @change="reload"
          class="rounded border-border accent-accent" />
        Show archived
      </label>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="project in projects" :key="project.id"
        :class="project.status === 'archived' ? 'opacity-60' : ''"
        class="relative">
        <Card :title="project.name" :description="project.description" :to="`/project/${project.id}`" />
        <span v-if="project.status === 'archived'"
          class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-text-muted/20 text-text-muted pointer-events-none">
          Archived
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState v-if="projects.length === 0" icon="folder"
      :title="searchTerm ? 'No results found' : 'No projects yet'"
      :description="searchTerm ? `No projects match &quot;${searchTerm}&quot;` : 'Create your first project to get started'" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
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
const includeArchived = ref(false);

const reload = () => {
  if (props.searchTerm && props.searchTerm.trim() !== '') {
    searchProjects(props.searchTerm, includeArchived.value);
  } else {
    loadProjects(includeArchived.value);
  }
};

watch(() => props.searchTerm, (newSearchTerm) => {
  if (newSearchTerm) {
    searchProjects(newSearchTerm, includeArchived.value);
  } else {
    loadProjects(includeArchived.value);
  }
});

onMounted(async () => {
  await loadProjects(includeArchived.value);
});

const filterProjects = async (term: string) => {
  if (term && term.trim() !== '') {
    await searchProjects(term, includeArchived.value);
  } else {
    await loadProjects(includeArchived.value);
  }
};

defineExpose({
  loadProjects,
  filterProjects
});
</script>
