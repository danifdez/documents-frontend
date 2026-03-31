<template>
  <div class="h-full overflow-y-auto">
    <div class="px-6 py-6">
      <div v-if="projectStore.loading" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent"></div>
      </div>

      <div v-else-if="projectStore.error" class="text-center py-12">
        <p class="text-red-500 text-sm">{{ projectStore.error }}</p>
      </div>

      <div v-else-if="projectStore.currentProject">
        <!-- Project header -->
        <PageHeader :breadcrumbs="breadcrumbItems" :subtitle="projectStore.currentProject.description || undefined">
          <template #title>
            <p v-if="!projectStore.currentProject.description" class="text-sm text-text-muted italic mt-1">No description</p>
          </template>
          <template #actions>
              <OfflineToggle v-if="projectStore.currentProject?.id" type="project" :id="projectStore.currentProject.id" />
              <button @click="openCreateThreadModal"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
                title="New thread">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                <span>Thread</span>
              </button>
              <button @click="createDocument"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
                title="New document">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                <span>Document</span>
              </button>
              <button v-if="featureStore.isEnabled('canvas')" @click="createCanvas"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
                title="New canvas">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                <span>Canvas</span>
              </button>
              <button v-if="featureStore.isEnabled('timelines')" @click="createTimeline"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
                title="New timeline">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
                <span>Timeline</span>
              </button>
              <button @click="openImportDocumentModal"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
                title="Import documents">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="1.75">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Import</span>
              </button>

              <Dropdown :showDots="true">
                <DropdownItem @click="openEditModal">Edit</DropdownItem>
                <DropdownItem @click="confirmDelete" className="text-red-500">Delete</DropdownItem>
              </Dropdown>
          </template>
        </PageHeader>

        <!-- Quick access to project sections -->
        <div class="mt-4 mb-6 flex flex-wrap gap-4">
          <router-link v-if="featureStore.isEnabled('relationships')" :to="`/project/${route.params.id}/relationships`"
            title="Explore entity relationships in this project"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span class="text-xs font-medium">Relations</span>
          </router-link>
          <router-link v-if="featureStore.isEnabled('bibliography')" :to="`/project/${route.params.id}/bibliography`"
            title="Manage citations and references for this project"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span class="text-xs font-medium">Bibliography</span>
          </router-link>
          <button v-if="featureStore.isEnabled('notes')" @click="openNotesPanel"
            title="Notes for this project"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md cursor-pointer gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span class="text-xs font-medium">Notes</span>
          </button>
          <router-link v-if="featureStore.isEnabled('calendar')" :to="`/project/${route.params.id}/calendar`"
            title="View project calendar"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-xs font-medium">Calendar</span>
          </router-link>
          <router-link v-if="featureStore.isEnabled('datasets')" to="/datasets"
            title="Structured data tables and analysis"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <span class="text-xs font-medium">Datasets</span>
          </router-link>
          <router-link v-if="featureStore.isEnabled('entities')" to="/entities"
            title="People, places, organizations and concepts"
            class="flex flex-col items-center justify-center w-24 h-24 bg-surface-elevated hover:bg-surface-hover text-text-secondary hover:text-text-primary rounded-xl border border-border transition-all duration-200 hover:shadow-md gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-xs font-medium">Entities</span>
          </router-link>
        </div>

        <div class="mb-8">
          <FilterBadge v-if="filterActive" :term="filterSummary.term" @clear="clearFilter" />

          <div v-if="selectedFile" class="mt-3 px-3 py-2 bg-surface rounded-lg border border-border">
            <span class="text-sm text-text-secondary">{{ selectedFile.name }}</span>
          </div>
        </div>

        <!-- Sections grid: Documents | Resources | Notes+Events -->
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_20rem] gap-6">

          <!-- Left column: Threads + Documents + Canvases + Timelines -->
          <div class="min-w-0">
            <section>
              <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Documents</h3>
              <div v-if="isLoading || isDocsLoading || isCanvasesLoading || isTimelinesLoading" class="flex justify-center py-8">
                <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
              </div>

              <div v-else class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                <div class="flex flex-col divide-y divide-border-light">
                  <div v-for="item in allDocsAndCanvases" :key="item.key"
                    class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-150 group border-l-3"
                    :class="item.type === 'thread' ? 'border-l-violet-500 bg-violet-500/5' : 'border-l-transparent'">
                    <router-link :to="item.to" class="flex items-center gap-3 min-w-0 flex-1">
                      <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                        :class="item.type === 'thread'
                          ? 'bg-violet-100 text-violet-600'
                          : item.type === 'canvas'
                            ? 'bg-amber-50 text-amber-500'
                            : item.type === 'timeline'
                              ? 'bg-emerald-50 text-emerald-500'
                              : 'bg-accent-subtle text-accent'
                        ">
                        <svg v-if="item.type === 'thread'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        <svg v-else-if="item.type === 'document'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <svg v-else-if="item.type === 'canvas'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                          <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm text-text-primary truncate">{{ item.name }}</p>
                        <p v-if="item.description" class="text-[10px] text-text-muted truncate">{{ item.description }}</p>
                      </div>
                    </router-link>
                    <span class="text-[10px] text-text-muted shrink-0">{{ formatDate(item.updatedAt) }}</span>
                    <button v-if="item.type !== 'thread'" @click.stop="openMoveModal(item)"
                      class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                      title="Move to...">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div v-if="!isLoading && !isDocsLoading && !isCanvasesLoading && !isTimelinesLoading && allDocsAndCanvases.length === 0"
                class="text-center py-8 rounded-xl border border-dashed border-border">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p class="text-xs text-text-muted">
                  {{ searchTerm ? 'No matching items.' : 'No threads or documents yet.' }}
                </p>
              </div>
            </section>
          </div>

          <!-- Middle column: Resources -->
          <div class="min-w-0">
            <section>
              <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Resources</h3>
              <div v-if="isResourcesLoading" class="flex justify-center py-8">
                <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
              </div>

              <div v-else class="flex flex-col gap-1">
                <router-link v-for="resource in filteredResources" :key="`r-${resource.id}`"
                  :to="`/resource/${resource.id}`"
                  class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors duration-150 group">
                  <span class="shrink-0 scale-75 origin-center"><IconType :mimeType="resource.mimeType" /></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-text-primary truncate">{{ resource.title || resource.name }}</p>
                  </div>
                  <span v-if="resource.type"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent shrink-0"
                    :title="getResourceTypeName(resource.type)">{{ getResourceTypeName(resource.type) }}</span>
                </router-link>
              </div>

              <div v-if="!isResourcesLoading && filteredResources.length === 0"
                class="text-center py-8 rounded-xl border border-dashed border-border">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p class="text-xs text-text-muted">
                  {{ searchTerm && projectResources.length > 0 ? 'No matching resources.' : 'No resources yet.' }}
                </p>
              </div>
            </section>
          </div>

          <!-- Right column: Notes + Events -->
          <div class="flex flex-col gap-6">
            <RecentNotesPanel v-if="featureStore.isEnabled('notes')"
              :notes="projectNotes" :isLoading="isNotesLoading" :showProject="false"
              @create="openNotesPanel" @open="openNoteInPanel" />
            <UpcomingEventsPanel v-if="featureStore.isEnabled('calendar')"
              :events="projectEvents" :isLoading="isEventsLoading" :showProject="false"
              :projectId="route.params.id"
              @create="showCreateEventModal = true" />
          </div>

        </div>


      </div>

      <EventModal v-if="project" v-model="showCreateEventModal" :projects="[project]" :default-project-id="project.id"
        @submit="handleEventCreated" />

      <MoveToThreadModal v-model="showMoveModal"
        :itemName="moveItem?.name || ''"
        :currentThreadId="null"
        :threads="threads"
        @move="handleMoveItem" />

      <ConfirmModal :isOpen="showDeleteDialog" title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone." confirmText="Delete"
        cancelText="Cancel" confirmVariant="danger" @confirm="deleteProjectHandler"
        @cancel="showDeleteDialog = false" />

      <ProjectEditModal v-model="showEditModal" :project-id="route.params.id"
        @project:updated="handleProjectUpdated" />

      <ThreadCreateModal v-model="showCreateThreadModal" :project-id="route.params.id"
        @thread:created="handleThreadCreated" />

      <ImportDocumentModal v-model="showImportDocumentModal" :project-id="route.params.id"
        @documents:imported="handleDocumentsImported" />
      <SearchInput :show="showSearch" :value="searchTerm" @search="filterThreadsAndDocuments"
        @close="showSearch = false" placeholder="Search threads, documents and resources..." />
    </div>
  </div>
</template>

<script setup>
import { useThreadList } from '../services/threads/useThreadList';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useCanvasList } from '../services/canvas/useCanvasList';
import { useResourceList } from '../services/resources/useResourceList';
import { useResourceType } from '../services/resources/useResourceType';
import { useProject } from '../services/projects/useProject';
import { useNotes } from '../services/notes/useNotes';
import { useCalendarEvents } from '../services/calendar/useCalendarEvents';
import { useTimelines } from '../services/timelines/useTimelines';
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import OfflineToggle from '../components/OfflineToggle.vue';
import MoveToThreadModal from '../components/ui/MoveToThreadModal.vue';
import apiClient from '../services/api';
import Dropdown from '../components/ui/Dropdown.vue';
import DropdownItem from '../components/ui/DropdownItem.vue';
import ProjectEditModal from '../components/projects/ProjectEditModal.vue';
import ThreadCreateModal from '../components/threads/ThreadCreateModal.vue';
import ImportDocumentModal from '../components/documents/ImportDocumentModal.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import SearchInput from '../components/search/SearchInput.vue';
import FilterBadge from '../components/search/FilterBadge.vue';
import Card from '../components/ui/Card.vue';
import IconType from '../components/resources/IconType.vue';
import RecentNotesPanel from '../components/notes/RecentNotesPanel.vue';
import UpcomingEventsPanel from '../components/calendar/UpcomingEventsPanel.vue';
import EventModal from '../components/calendar/EventModal.vue';
import { useNotification } from '../composables/useNotification';
import { useProjectStore } from '../store/projectStore';
import { useFeatureStore } from '../store/featureStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const { showSearch, showNotesPanel } = useGlobalKeyboard();

const openNotesPanel = () => {
  showNotesPanel.value = true;
};

const openNoteInPanel = (noteId) => {
  showNotesPanel.value = true;
};
const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const featureStore = useFeatureStore();
const showDeleteDialog = ref(false);
const showEditModal = ref(false);
const showCreateThreadModal = ref(false);
const showImportDocumentModal = ref(false);
const showMoveModal = ref(false);
const moveItem = ref(null);
const showCreateEventModal = ref(false);
const searchTerm = ref('');
const filteredThreads = ref([]);
const filteredDocuments = ref([]);
const displayItems = ref([]);
const selectedFile = ref(null);
const { deleteProject } = useProject();
const { isLoading, threads, loadThreads } = useThreadList();
const { isLoading: isDocsLoading, documents: projectDocuments, loadDocumentsByProject } = useDocumentProjectList();
const { isLoading: isResourcesLoading, loadResourcesByProject } = useResourceList();
const { canvases: projectCanvases, isLoading: isCanvasesLoading, loadCanvasesByProject } = useCanvasList();
const { loadResourceTypes, getResourceTypeAbbreviation, getResourceTypeName } = useResourceType();
const { notes: projectNotes, isLoading: isNotesLoading, loadNotesByProject } = useNotes();
const { events: projectEvents, isLoading: isEventsLoading, loadEventsByProject, createEvent } = useCalendarEvents();
const { timelines: projectTimelines, isLoading: isTimelinesLoading, loadTimelinesByProject } = useTimelines();
const projectResources = ref([]);
const filteredResources = ref([]);
const filteredCanvases = ref([]);
const filteredTimelines = ref([]);
const notification = useNotification();

const project = computed(() => projectStore.currentProject);

const breadcrumbItems = computed(() => {
  return projectStore.currentProject ? [
    { name: projectStore.currentProject.name }
  ] : [];
});

const openMoveModal = (item) => {
  moveItem.value = item;
  showMoveModal.value = true;
};

const handleMoveItem = async (targetThreadId) => {
  if (!moveItem.value) return;
  try {
    const item = moveItem.value;
    const endpoint = item.type === 'canvas' ? 'canvases' : 'docs';
    await apiClient.patch(`/${endpoint}/${item.id}`, {
      thread: targetThreadId ? { id: targetThreadId } : null,
    });
    notification.success(`Moved "${item.name}" successfully`);
    showMoveModal.value = false;
    const id = route.params.id;
    await loadDocumentsByProject(id);
    await loadCanvasesByProject(id);
    await loadThreads(id);
  } catch {
    notification.error('Failed to move item');
  }
};

const handleEventCreated = async (data) => {
  try {
    await createEvent(data);
    await loadEventsByProject(route.params.id);
  } catch (e) {
    notification.error('Failed to create event');
  }
};

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

  await loadResourceTypes();

  if (projectStore.currentProject && projectStore.currentProject.id === id) {
    await loadThreads(id);
    await loadDocumentsByProject(id);
    await loadCanvasesByProject(id);
    projectResources.value = await loadResourcesByProject(id);
    await loadNotesByProject(id);
    await loadEventsByProject(id);
    await loadTimelinesByProject(id);
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
    await loadCanvasesByProject(id);
    projectResources.value = await loadResourcesByProject(id);
    await loadNotesByProject(id);
    await loadEventsByProject(id);
    await loadTimelinesByProject(id);

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
  const id = route.params.id;
  await loadDocumentsByProject(id);
};

const openCreateThreadModal = () => {
  showCreateThreadModal.value = true;
};

const createDocument = async () => {
  const id = route.params.id;
  router.push({ path: '/document/new', query: { projectId: id } });
};

const createCanvas = async () => {
  const id = route.params.id;
  router.push({ path: '/canvas/new', query: { projectId: id } });
};

const createTimeline = async () => {
  const id = route.params.id;
  router.push({ path: '/timeline/new', query: { projectId: id } });
};

const allDocsAndCanvases = computed(() => {
  const ths = filteredThreads.value.map(t => ({
    id: t.id,
    key: `t-${t.id}`,
    name: t.name,
    description: t.description,
    to: `/thread/${t.id}`,
    type: 'thread',
    updatedAt: t.updatedAt || t.createdAt,
  }));
  const docs = filteredDocuments.value.map(d => ({
    id: d.id,
    key: `d-${d.id}`,
    name: d.name,
    description: d.description,
    to: `/document/${d.id}`,
    type: 'document',
    updatedAt: d.updatedAt || d.createdAt,
  }));
  const cvs = filteredCanvases.value.map(c => ({
    id: c.id,
    key: `cv-${c.id}`,
    name: c.name,
    description: '',
    to: `/canvas/${c.id}`,
    type: 'canvas',
    updatedAt: c.updatedAt || c.createdAt,
  }));
  const tls = filteredTimelines.value.map(t => ({
    id: t.id,
    key: `tl-${t.id}`,
    name: t.name,
    description: `${(t.timelineData || []).length} event${(t.timelineData || []).length !== 1 ? 's' : ''}`,
    to: `/timeline/${t.id}`,
    type: 'timeline',
    updatedAt: t.updatedAt || t.createdAt,
  }));
  const sortByDate = (arr) => arr.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return [...sortByDate(ths), ...sortByDate(docs), ...sortByDate(cvs), ...sortByDate(tls)];
});

const handleThreadCreated = async () => {
  const id = route.params.id;
  loadThreads(id);
};

const searchThreads = (searchTerm) => {
  filterThreadsAndDocuments(searchTerm);
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const norm = (str) => str ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

const filterThreadsAndDocuments = (term) => {
  searchTerm.value = term || '';
  const normalized = norm(term || '').trim();

  if (!normalized) {
    filteredThreads.value = threads.value;
  } else {
    filteredThreads.value = threads.value.filter(thread =>
      norm(thread.name).includes(normalized) ||
      norm(thread.description).includes(normalized)
    );
  }

  const docs = projectDocuments.value || [];
  const unthreaded = docs.filter(d => !d.thread || d.thread === null);

  if (!normalized) {
    filteredDocuments.value = unthreaded;
  } else {
    filteredDocuments.value = unthreaded.filter(doc =>
      norm(doc.name).includes(normalized) ||
      norm(doc.description).includes(normalized)
    );
  }

  const cvs = projectCanvases.value || [];
  if (!normalized) {
    filteredCanvases.value = cvs;
  } else {
    filteredCanvases.value = cvs.filter(c =>
      norm(c.name).includes(normalized)
    );
  }

  const tls = projectTimelines.value || [];
  if (!normalized) {
    filteredTimelines.value = tls;
  } else {
    filteredTimelines.value = tls.filter(t =>
      norm(t.name).includes(normalized)
    );
  }

  const resources = projectResources.value || [];
  if (!normalized) {
    filteredResources.value = resources;
  } else {
    filteredResources.value = resources.filter(res =>
      norm(res.title).includes(normalized) ||
      norm(res.name).includes(normalized) ||
      norm(res.originalName).includes(normalized)
    );
  }

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

  filteredResources.value.forEach(r => displayItems.value.push({
    key: `r-${r.id}`,
    id: r.id,
    title: r.title || r.name,
    description: r.originalName,
    to: `/resource/${r.id}`,
    type: 'resource'
  }));
};

watch([threads, projectDocuments, projectCanvases, projectResources, projectTimelines, searchTerm], () => {
  filterThreadsAndDocuments(searchTerm.value);
}, { immediate: true });
</script>
