<template>
  <div class="h-full overflow-y-auto">
    <div class="px-6 py-4">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-end justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-text-primary tracking-tight">Projects</h1>
            <p class="mt-1 text-sm text-text-muted">Manage and explore your document projects</p>
          </div>
          <div class="flex items-center gap-3">
            <FilterBadge v-if="filterActive" :term="searchTerm" @clear="clearFilter" />
            <button @click="showImportModal = true"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.75">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Import Resource</span>
            </button>
            <button @click="openProjectModal"
              class="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clip-rule="evenodd" />
              </svg>
              <span>New Project</span>
            </button>
          </div>
        </div>
        <div class="mt-6 h-px bg-border"></div>

        <!-- Quick access to global sections -->
        <div class="mt-4 flex flex-wrap gap-4">
          <button @click="openBrowser"
            title="Browse and capture web content"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md cursor-pointer gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span class="text-xs font-medium">Browser</span>
          </button>
          <router-link v-if="featureStore.isEnabled('entities')" to="/entities"
            title="Manage people, places, organizations and concepts"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-xs font-medium">Entities</span>
          </router-link>
          <router-link v-if="featureStore.isEnabled('datasets')" to="/datasets"
            title="Create and analyze structured data tables"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span class="text-xs font-medium">Datasets</span>
          </router-link>
          <button v-if="featureStore.isEnabled('notes')" @click="openNotesPanel"
            title="Quick notes and ideas across projects"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md cursor-pointer gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span class="text-xs font-medium">Notes</span>
          </button>
          <router-link v-if="featureStore.isEnabled('calendar')" to="/calendar"
            title="Schedule and track events and deadlines"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-xs font-medium">Calendar</span>
          </router-link>
          <router-link v-if="featureStore.isEnabled('knowledge_base')" to="/knowledge-base"
            title="Curated reference articles and documentation"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span class="text-xs font-medium">Knowledge</span>
          </router-link>
          <router-link v-if="featureStore.isEnabled('bibliography')" to="/bibliography"
            title="Manage citations and references across projects"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span class="text-xs font-medium">Bibliography</span>
          </router-link>
        </div>
      </div>

      <!-- Pending resources -->
      <div v-if="pendingResources.length > 0" class="mb-8">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pending Resources
            <span class="text-xs font-normal text-text-muted">({{ pendingResources.length }} unassigned)</span>
          </h2>
        </div>
        <div class="bg-surface-elevated rounded-xl border border-amber-200 dark:border-amber-800/40 overflow-hidden">
          <div class="flex flex-col divide-y divide-border-light">
            <div v-for="resource in pendingResources" :key="resource.id"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-150 group">
              <router-link :to="`/resource/${resource.id}`" class="flex items-center gap-3 min-w-0 flex-1">
                <IconType :mimeType="resource.mimeType" class="shrink-0 scale-75 origin-center" />
                <p class="text-sm text-text-primary truncate">{{ resource.title || resource.name }}</p>
              </router-link>

              <!-- Assign to project -->
              <select @click.stop
                @change="handleAssignResource(resource.id, $event.target.value); $event.target.value = ''"
                class="text-xs bg-surface border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer shrink-0 max-w-[10rem]">
                <option value="">Assign to project...</option>
                <option v-for="project in projectsList" :key="project.id" :value="project.id">
                  {{ project.name }}
                </option>
              </select>

              <!-- Delete -->
              <button @click.stop="confirmDeleteResource(resource)"
                class="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                title="Delete resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="mt-4 h-px bg-border"></div>
      </div>

      <ConfirmModal :isOpen="showDeleteResourceDialog" title="Delete Resource"
        message="Are you sure you want to delete this resource? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel" confirmVariant="danger"
        @confirm="handleDeleteResource" @cancel="showDeleteResourceDialog = false" />

      <!-- Main layout: Projects left | Notes & Events right -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6">

        <!-- Left: Project grid -->
        <div class="min-w-0">
          <ProjectList ref="projectsComponent" :search-term="searchTerm" />
        </div>

        <!-- Right: Notes & Events sidebar -->
        <div class="flex flex-col gap-6">
          <RecentNotesPanel :notes="allNotes" :isLoading="isNotesLoading"
            @create="openNotesPanel" @open="openNoteInPanel" />
          <UpcomingEventsPanel :events="allEvents" :isLoading="isEventsLoading" @create="showNewEventModal = true" />
        </div>

      </div>

      <ProjectAddModal v-model="showProjectModal" @project:created="onNewProject" />
      <ImportDocumentModal v-model="showImportModal" @documents:imported="handleResourcesImported" />
      <SearchInput :show="showSearch" :value="searchTerm" @search="searchProjects" @close="showSearch = false"
        placeholder="Search projects..." />

      <EventModal v-model="showNewEventModal" :projects="projectsList" @submit="handleEventCreated" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ProjectList from '../components/projects/ProjectList.vue';
import RecentNotesPanel from '../components/notes/RecentNotesPanel.vue';
import UpcomingEventsPanel from '../components/calendar/UpcomingEventsPanel.vue';
import ProjectAddModal from '../components/projects/ProjectAddModal.vue';
import ImportDocumentModal from '../components/documents/ImportDocumentModal.vue';
import SearchInput from '../components/search/SearchInput.vue';
import FilterBadge from '../components/search/FilterBadge.vue';
import IconType from '../components/resources/IconType.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import { useProjectStore } from '../store/projectStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';
import { useResourceList } from '../services/resources/useResourceList';
import { useResource } from '../services/resources/useResource';
import { useNotification } from '../composables/useNotification';
import { useNotes } from '../services/notes/useNotes';
import { useCalendarEvents } from '../services/calendar/useCalendarEvents';
import { useProjectList } from '../services/projects/useProjectList';
import { useFeatureStore } from '../store/featureStore';
import EventModal from '../components/calendar/EventModal.vue';

const featureStore = useFeatureStore();

const openBrowser = async () => {
  await window.electronAPI.openExternalBrowser();
};

const projectsComponent = ref(null);
const showProjectModal = ref(false);
const showImportModal = ref(false);
const searchTerm = ref('');
const filterActive = computed(() => !!(searchTerm.value && String(searchTerm.value).trim().length > 0));

const clearFilter = () => {
  searchTerm.value = '';
  if (projectsComponent.value && projectsComponent.value.filterProjects) {
    projectsComponent.value.filterProjects('');
  }
};
const projectStore = useProjectStore();
const { loadPendingResources, assignResourceToProject } = useResourceList();
const { deleteResource } = useResource();
const notification = useNotification();
const pendingResources = ref([]);
const showDeleteResourceDialog = ref(false);
const resourceToDelete = ref(null);

const { notes: allNotes, isLoading: isNotesLoading, loadNotes } = useNotes();
const { events: allEvents, isLoading: isEventsLoading, loadEventsByRange, createEvent } = useCalendarEvents();
const { projects: projectsList, loadProjects: loadProjectsList } = useProjectList();

const showNewEventModal = ref(false);

const { showSearch, showNotesPanel } = useGlobalKeyboard();

const openNotesPanel = () => {
  showNotesPanel.value = true;
};

const openNoteInPanel = (noteId) => {
  showNotesPanel.value = true;
};

const openProjectModal = () => {
  showProjectModal.value = true;
};

const onNewProject = () => {
  if (projectsComponent.value && projectsComponent.value.loadProjects) {
    projectsComponent.value.loadProjects();
  }
};

const searchProjects = (term) => {
  searchTerm.value = term;
  if (projectsComponent.value && projectsComponent.value.filterProjects) {
    projectsComponent.value.filterProjects(term);
  }
};

const handleEventCreated = async (data) => {
  try {
    await createEvent(data);
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    await loadEventsByRange(now.toISOString(), end.toISOString());
  } catch (e) {
    // silently fail
  }
};

const handleAssignResource = async (resourceId, projectId) => {
  if (!projectId) return;
  try {
    await assignResourceToProject(resourceId, projectId);
    pendingResources.value = pendingResources.value.filter(r => r.id !== resourceId);
    notification.success('Resource assigned to project');
  } catch (e) {
    notification.error('Failed to assign resource');
  }
};

const confirmDeleteResource = (resource) => {
  resourceToDelete.value = resource;
  showDeleteResourceDialog.value = true;
};

const handleDeleteResource = async () => {
  showDeleteResourceDialog.value = false;
  if (!resourceToDelete.value) return;
  const id = resourceToDelete.value.id;
  try {
    await deleteResource(id);
    pendingResources.value = pendingResources.value.filter(r => r.id !== id);
    notification.success('Resource deleted');
  } catch (e) {
    notification.error('Failed to delete resource');
  }
  resourceToDelete.value = null;
};

const handleResourcesImported = async () => {
  try {
    pendingResources.value = await loadPendingResources();
  } catch (e) {
    pendingResources.value = [];
  }
};

onMounted(async () => {
  projectStore.clearCurrentProject();
  try {
    pendingResources.value = await loadPendingResources();
  } catch (e) {
    pendingResources.value = [];
  }

  // Load project list for modals
  try {
    await loadProjectsList();
  } catch (e) {
    // silently fail
  }

  // Load recent notes
  try {
    await loadNotes();
  } catch (e) {
    // silently fail
  }

  // Load upcoming events (next 30 days)
  try {
    const now = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    await loadEventsByRange(now.toISOString(), end.toISOString());
  } catch (e) {
    // silently fail
  }
});
</script>
