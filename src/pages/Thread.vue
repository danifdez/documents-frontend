<template>
  <div class="h-full overflow-y-auto">
    <div class="px-6 py-6">
      <PageHeader :breadcrumbs="breadcrumbItems" :subtitle="thread?.description || undefined">
        <template #title>
          <p v-if="thread && !thread.description" class="text-sm text-text-muted italic mt-1">No description</p>
          <FilterBadge v-if="filterActive" :term="searchQuery" @clear="clearFilter" />
        </template>
        <template #actions>
          <OfflineToggle v-if="threadId" type="thread" :id="Number(threadId)" />
          <button @click="showCreateThreadModal = true"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
            title="New sub-thread">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>Thread</span>
          </button>
          <button @click="createNewDocument"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
            title="New document">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>Document</span>
          </button>
          <button v-if="featureStore.isEnabled('canvas')" @click="createNewCanvas"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
            title="New canvas">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>Canvas</span>
          </button>
          <button v-if="featureStore.isEnabled('timelines')" @click="createNewTimeline"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
            title="New timeline">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
            </svg>
            <span>Timeline</span>
          </button>
          <button @click="showImportModal = true"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-elevated hover:bg-surface-hover text-text-primary text-sm font-medium rounded-lg border border-border transition-all duration-200 hover:shadow-sm cursor-pointer"
            title="Import resources">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Import</span>
          </button>
          <Dropdown :showDots="true">
            <DropdownItem @click="showEditModal = true">Edit</DropdownItem>
            <DropdownItem v-if="thread?.status !== 'archived'" @click="confirmArchive">Archive</DropdownItem>
            <DropdownItem v-else @click="handleUnarchive">Unarchive</DropdownItem>
            <DropdownItem @click="confirmDelete" className="text-red-500">Delete</DropdownItem>
          </Dropdown>
        </template>
      </PageHeader>

      <!-- Main grid: Documents left | Resources + Notes right -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Left: Sub-threads + Documents, Canvases, Timelines -->
        <div class="min-w-0 flex flex-col gap-8">

          <!-- Sub-threads -->
          <section v-if="childThreads.length > 0">
            <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Sub-threads</h3>
            <div class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
              <div class="flex flex-col divide-y divide-border-light">
                <router-link v-for="child in childThreads" :key="`st-${child.id}`" :to="`/thread/${child.id}`"
                  class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-150 group border-l-3 border-l-violet-500 bg-violet-500/5">
                  <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-violet-100 text-violet-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-text-primary truncate">{{ child.name }}</p>
                    <p v-if="child.description" class="text-[10px] text-text-muted truncate">{{ child.description }}</p>
                  </div>
                </router-link>
              </div>
            </div>
          </section>

          <section>
            <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Documents</h3>
            <div v-if="isDocsLoading" class="flex justify-center py-8">
              <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
            </div>

            <div v-else-if="allItems.length > 0" class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
              <div class="flex flex-col divide-y divide-border-light">
                <div v-for="item in allItems" :key="item.key"
                  class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-150 group">
                  <router-link :to="item.to" class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      :class="{
                        'bg-blue-100 text-blue-600': item.type === 'document',
                        'bg-amber-50 text-amber-500': item.type === 'canvas',
                        'bg-emerald-50 text-emerald-500': item.type === 'timeline',
                      }">
                      <svg v-if="item.type === 'document'" xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none"
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
                    </div>
                  </router-link>
                  <span class="text-[10px] text-text-muted shrink-0">{{ formatDate(item.updatedAt) }}</span>
                  <button @click.stop="openMoveModal(item)"
                    class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                    title="Move to...">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div v-else class="text-center py-8 rounded-xl border border-dashed border-border">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-xs text-text-muted">No documents yet.</p>
            </div>
          </section>
        </div>

        <!-- Right: Resources + Notes -->
        <div class="min-w-0 flex flex-col gap-8">
          <!-- Resources -->
          <section>
            <h3 class="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">Resources</h3>
            <div v-if="isResourcesLoading" class="flex justify-center py-8">
              <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
            </div>

            <div v-else-if="threadResources.length > 0" class="flex flex-col gap-1">
              <div v-for="resource in threadResources" :key="`r-${resource.id}`"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors duration-150 group">
                <router-link :to="`/resource/${resource.id}`" class="flex items-center gap-2.5 min-w-0 flex-1">
                  <span class="shrink-0 scale-75 origin-center"><IconType :mimeType="resource.mimeType" /></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-text-primary truncate">{{ resource.title || resource.name }}</p>
                  </div>
                </router-link>
                <button @click.stop="openMoveModal({ id: resource.id, name: resource.title || resource.name, type: 'resource', key: `r-${resource.id}` })"
                  class="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors opacity-0 group-hover:opacity-100 shrink-0 cursor-pointer"
                  title="Move to...">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
              </div>
            </div>

            <div v-else class="text-center py-8 rounded-xl border border-dashed border-border">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p class="text-xs text-text-muted">No resources yet.</p>
            </div>
          </section>

          <!-- Notes -->
          <RecentNotesPanel v-if="featureStore.isEnabled('notes')"
            :notes="threadNotes" :isLoading="isNotesLoading" :showProject="false"
            @create="openNotesPanel" @open="openNoteInPanel" />
        </div>

      </div>

      <MoveToThreadModal v-model="showMoveModal"
        :itemName="moveItem?.name || ''"
        :currentThreadId="Number(threadId)"
        :threads="projectThreads"
        @move="handleMoveItem" />

      <ThreadCreateModal v-model="showCreateThreadModal"
        :project-id="projectStore.currentProject?.id?.toString() || ''"
        :parent-id="threadId"
        @thread:created="handleSubThreadCreated" />

      <ImportDocumentModal v-model="showImportModal"
        :project-id="projectStore.currentProject?.id?.toString() || ''"
        :thread-id="threadId?.toString() || ''"
        @documents:imported="handleResourcesImported" />

      <ConfirmModal :isOpen="showDeleteDialog" title="Delete Thread"
        message="Are you sure you want to delete this thread? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel" confirmVariant="danger"
        @confirm="handleDelete" @cancel="showDeleteDialog = false" />

      <ConfirmModal :isOpen="showArchiveDialog" title="Archive Thread"
        message="Archiving will move resource files to the archive storage and delete all related embeddings for this thread and its children."
        confirmText="Archive" cancelText="Cancel" @confirm="handleArchive"
        @cancel="showArchiveDialog = false" />

      <!-- Edit thread modal -->
      <Modal v-model="showEditModal" title="Edit Thread">
        <form @submit.prevent="handleEdit" class="space-y-4">
          <FormField label="Name" v-model="editName" placeholder="Thread name" required />
          <FormField label="Description" v-model="editDescription" type="textarea" placeholder="Description" hint="Optional" />
          <div class="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" @click="showEditModal = false">Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      <SearchInput :show="showSearch" :value="searchQuery" @search="handleSearch" @close="showSearch = false"
        placeholder="Search documents..." />
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useDocumentList } from '../services/documents/useDocumentList';
import { useCanvasList } from '../services/canvas/useCanvasList';
import { useResourceList } from '../services/resources/useResourceList';
import { useThreadList } from '../services/threads/useThreadList';
import { useNotes } from '../services/notes/useNotes';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '../components/ui/PageHeader.vue';
import OfflineToggle from '../components/OfflineToggle.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import SearchInput from '../components/search/SearchInput.vue';
import FilterBadge from '../components/search/FilterBadge.vue';
import IconType from '../components/resources/IconType.vue';
import ImportDocumentModal from '../components/documents/ImportDocumentModal.vue';
import RecentNotesPanel from '../components/notes/RecentNotesPanel.vue';
import ThreadCreateModal from '../components/threads/ThreadCreateModal.vue';
import MoveToThreadModal from '../components/ui/MoveToThreadModal.vue';
import Dropdown from '../components/ui/Dropdown.vue';
import DropdownItem from '../components/ui/DropdownItem.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import Modal from '../components/ui/Modal/Modal.vue';
import Button from '../components/ui/Button.vue';
import FormField from '../components/ui/FormField.vue';
import { useThread } from '../services/threads/useThread';
import { useNotification } from '../composables/useNotification';
import apiClient from '../services/api';
import { useProjectStore } from '../store/projectStore';
import { useFeatureStore } from '../store/featureStore';
import { useGlobalKeyboard } from '../composables/useGlobalKeyboard';

const route = useRoute();
const router = useRouter();
const { documents, loadDocuments } = useDocumentList();
const { canvases, loadCanvasesByThread } = useCanvasList();
const { loadResourcesByThread, assignResourceToThread } = useResourceList();
const { threads: projectThreads, loadThreads: loadProjectThreads } = useThreadList();
const { notes: threadNotes, isLoading: isNotesLoading, loadNotesByThread } = useNotes();
const { loadThread, loadChildThreads, updateThread, deleteThread, archiveThread, unarchiveThread } = useThread();
const { showSearch, showNotesPanel } = useGlobalKeyboard();

const openNotesPanel = () => {
  showNotesPanel.value = true;
};

const openNoteInPanel = (noteId) => {
  showNotesPanel.value = true;
};
const thread = ref(null);
const projectStore = useProjectStore();
const featureStore = useFeatureStore();
const searchQuery = ref('');
const filterActive = computed(() => !!(searchQuery.value && String(searchQuery.value).trim().length > 0));
const threadId = computed(() => route.params.id);
const isDocsLoading = ref(true);
const isResourcesLoading = ref(false);
const threadResources = ref([]);
const showImportModal = ref(false);
const showCreateThreadModal = ref(false);
const showEditModal = ref(false);
const showDeleteDialog = ref(false);
const showArchiveDialog = ref(false);
const childThreads = ref([]);
const editName = ref('');
const editDescription = ref('');
const showMoveModal = ref(false);
const moveItem = ref(null);
const notification = useNotification();

watch(showEditModal, (v) => {
  if (v && thread.value) {
    editName.value = thread.value.name || '';
    editDescription.value = thread.value.description || '';
  }
});

const clearFilter = () => {
  searchQuery.value = '';
};

const filteredDocuments = computed(() => {
  if (!searchQuery.value.trim()) return documents.value;
  const query = searchQuery.value.toLowerCase();
  return documents.value.filter(doc => doc.name.toLowerCase().includes(query));
});

const filteredCanvases = computed(() => {
  if (!searchQuery.value.trim()) return canvases.value;
  const query = searchQuery.value.toLowerCase();
  return canvases.value.filter(c => c.name.toLowerCase().includes(query));
});

const handleSearch = (query) => {
  searchQuery.value = query;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const createNewDocument = () => {
  if (thread.value) {
    router.push({ path: '/document/new', query: { threadId: thread.value.id } });
  }
};

const createNewCanvas = () => {
  if (thread.value) {
    router.push({ path: '/canvas/new', query: { threadId: thread.value.id } });
  }
};

const createNewTimeline = () => {
  if (projectStore.currentProject) {
    router.push({ path: '/timeline/new', query: { projectId: projectStore.currentProject.id } });
  }
};

const allItems = computed(() => {
  const docs = filteredDocuments.value.map(d => ({
    id: d.id,
    key: `d-${d.id}`,
    name: d.name,
    to: `/document/${d.id}`,
    type: 'document',
    updatedAt: d.updatedAt || d.createdAt,
  }));
  const cvs = filteredCanvases.value.map(c => ({
    id: c.id,
    key: `c-${c.id}`,
    name: c.name,
    to: `/canvas/${c.id}`,
    type: 'canvas',
    updatedAt: c.updatedAt || c.createdAt,
  }));
  return [...docs, ...cvs].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
});

const breadcrumbItems = computed(() => {
  const items = [];
  if (projectStore.currentProject) {
    items.push({
      name: projectStore.currentProject.name,
      path: `/project/${projectStore.currentProject.id}`
    });
  }
  if (thread.value?.parent) {
    items.push({
      name: thread.value.parent.name,
      path: `/thread/${thread.value.parent.id}`
    });
  }
  if (thread.value) {
    items.push({ name: thread.value.name });
  }
  return items;
});

const loadResources = async () => {
  isResourcesLoading.value = true;
  try {
    threadResources.value = await loadResourcesByThread(threadId.value);
  } catch {
    threadResources.value = [];
  } finally {
    isResourcesLoading.value = false;
  }
};

const handleResourcesImported = async () => {
  await loadResources();
};

const confirmDelete = () => {
  showDeleteDialog.value = true;
};

const confirmArchive = () => {
  showArchiveDialog.value = true;
};

const handleArchive = async () => {
  showArchiveDialog.value = false;
  const success = await archiveThread(threadId.value);
  if (success) {
    notification.success('Thread archived');
    if (projectStore.currentProject) {
      router.push(`/project/${projectStore.currentProject.id}`);
    } else {
      router.push('/');
    }
  } else {
    notification.error('Failed to archive thread');
  }
};

const handleUnarchive = async () => {
  const success = await unarchiveThread(threadId.value);
  if (success) {
    notification.success('Thread unarchived');
    thread.value = await loadThread(threadId.value);
  } else {
    notification.error('Failed to unarchive thread');
  }
};

const handleDelete = async () => {
  showDeleteDialog.value = false;
  const success = await deleteThread(threadId.value);
  if (success) {
    notification.success('Thread deleted');
    if (projectStore.currentProject) {
      router.push(`/project/${projectStore.currentProject.id}`);
    } else {
      router.push('/');
    }
  } else {
    notification.error('Failed to delete thread');
  }
};

const handleEdit = async () => {
  try {
    await updateThread(threadId.value, {
      name: editName.value.trim(),
      description: editDescription.value.trim() || null,
    });
    thread.value.name = editName.value.trim();
    thread.value.description = editDescription.value.trim() || null;
    showEditModal.value = false;
    notification.success('Thread updated');
  } catch {
    notification.error('Failed to update thread');
  }
};

const openMoveModal = (item) => {
  moveItem.value = item;
  showMoveModal.value = true;
};

const handleMoveItem = async (targetThreadId) => {
  if (!moveItem.value) return;
  try {
    const item = moveItem.value;
    if (item.type === 'resource') {
      if (targetThreadId === null) {
        // Move to project root: set thread to null
        await apiClient.patch(`/resources/${item.id}`, { thread: null });
      } else {
        await assignResourceToThread(item.id, targetThreadId);
      }
    } else {
      // document or canvas — use PATCH /docs/:id or /canvases/:id
      const endpoint = item.type === 'canvas' ? 'canvases' : 'docs';
      await apiClient.patch(`/${endpoint}/${item.id}`, {
        thread: targetThreadId ? { id: targetThreadId } : null,
      });
    }
    notification.success(`Moved "${item.name}" successfully`);
    showMoveModal.value = false;
    // Reload lists
    await loadDocuments(threadId.value);
    await loadCanvasesByThread(threadId.value);
    await loadResources();
  } catch {
    notification.error('Failed to move item');
  }
};

const handleSubThreadCreated = async () => {
  try {
    childThreads.value = await loadChildThreads(threadId.value);
  } catch { }
};

onMounted(async () => {
  try {
    thread.value = await loadThread(threadId.value);
    await loadDocuments(threadId.value);
    await loadCanvasesByThread(threadId.value);
    isDocsLoading.value = false;
    await loadResources();
    try { childThreads.value = await loadChildThreads(threadId.value); } catch { }
    if (projectStore.currentProject) {
      try { await loadProjectThreads(projectStore.currentProject.id.toString()); } catch { }
    }
    if (featureStore.isEnabled('notes')) {
      try { await loadNotesByThread(threadId.value); } catch { }
    }
  } catch (error) {
    isDocsLoading.value = false;
    console.error('Error loading thread:', error);
  }
});
</script>
