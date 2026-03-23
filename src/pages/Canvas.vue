<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Top bar: breadcrumb + canvas name -->
    <div class="flex-shrink-0 pb-3">
      <Breadcrumb :items="breadcrumbItems" />
      <div class="flex items-center gap-3 mt-1">
        <input id="canvasName" v-model="canvasData.name" type="text" required placeholder="Canvas name..."
          class="flex-1 px-4 py-2 bg-transparent border-0 border-b border-border text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors tracking-tight"
          @blur="handleNameChange" />
        <Button v-if="!isNewCanvas" variant="danger" size="small" @click="removeCanvasConfirm">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </Button>
      </div>
    </div>

    <!-- Toolbar + Canvas -->
    <div class="flex-1 min-h-0 flex flex-col">
      <CanvasToolbar :is-saving="isSaving" :saved-successfully="savedSuccessfully"
        :pending-tool="pendingTool?.type || null"
        @select-tool="onSelectTool" @clear-tool="pendingTool = null"
        @pick-doc="openDocPicker" @pick-resource="openResourcePicker"
        @pick-image="openImageModal" @export="handleExport" />
      <div class="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
        <CanvasEditor ref="canvasEditorRef" :canvas-data="canvasData.canvasData"
          :pending-tool="pendingTool"
          @canvas-change="handleCanvasChange" @edit-image="handleEditImage"
          @node-placed="pendingTool = null" />
      </div>
    </div>

    <!-- Confirm Remove Modal -->
    <ConfirmModal :is-open="showRemoveModal" title="Remove Canvas"
      message="Are you sure you want to remove this canvas?" confirm-text="Remove" cancel-text="Cancel"
      confirm-variant="danger" @confirm="handleRemoveConfirm" @cancel="showRemoveModal = false" />

    <!-- Document Picker Modal -->
    <Modal v-model="showDocPicker" :title="pickerSelectedItem ? pickerSelectedItem.name : 'Select Document'"
      :wide="!!pickerSelectedItem">
      <!-- Step 1: List -->
      <div v-if="!pickerSelectedItem" class="flex flex-col gap-1 max-h-64 overflow-y-auto">
        <div v-if="projectDocs.length === 0" class="py-4 text-center text-sm text-text-muted">
          No documents in this project
        </div>
        <button v-for="doc in projectDocs" :key="doc.id" @click="loadDocContent(doc)"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left cursor-pointer w-full">
          <svg class="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-sm text-text-primary truncate">{{ doc.name }}</span>
        </button>
      </div>
      <!-- Step 2: Content viewer with TOC sidebar -->
      <div v-else class="flex flex-col gap-2 h-full min-h-0">
        <div class="flex items-center gap-2 shrink-0">
          <button @click="pickerSelectedItem = null" class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="flex-1 relative">
            <input v-model="pickerSearch" type="text" placeholder="Search in content..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              @keydown.enter.prevent="navigateSearchResult" />
            <span v-if="pickerSearch.trim() && pickerSearchCount > 0"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
              {{ Math.min(pickerSearchIndex, pickerSearchCount) }}/{{ pickerSearchCount }}
            </span>
          </div>
        </div>
        <p class="text-[10px] text-text-muted shrink-0">Select a fragment of text, or click "Add" for the whole document.</p>
        <div class="flex gap-4 flex-1 min-h-0">
          <!-- Content -->
          <div ref="fragmentContentRef"
            class="flex-1 min-w-0 overflow-y-auto border border-border rounded-lg p-5 text-sm text-text-primary picker-content select-text cursor-text"
            v-html="pickerHighlightedContent"></div>
          <!-- TOC sidebar -->
          <div v-if="pickerHeadings.length > 0" class="w-64 shrink-0 overflow-y-auto border-l border-border pl-4">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Contents</p>
            <div class="flex flex-col gap-1">
              <button v-for="(h, i) in pickerHeadings" :key="i" @click="scrollToHeading(h)"
                class="text-left text-xs px-2 py-1.5 rounded text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                :class="{ 'pl-4': h.tag === 'h2', 'pl-6': h.tag === 'h3', 'pl-8': h.tag === 'h4' }"
                :title="h.text">
                <span class="line-clamp-2">{{ h.text }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <template v-if="pickerSelectedItem" #footer>
        <Button variant="secondary" size="small" @click="showDocPicker = false; pickerSelectedItem = null">Cancel</Button>
        <Button size="small" @click="confirmFragment('docRef')">Add</Button>
      </template>
    </Modal>

    <!-- Resource Picker Modal -->
    <Modal v-model="showResourcePicker" :title="pickerSelectedItem ? pickerSelectedItem.name : 'Select Resource'"
      :wide="!!pickerSelectedItem">
      <!-- Step 1: List -->
      <div v-if="!pickerSelectedItem" class="flex flex-col gap-1 max-h-64 overflow-y-auto">
        <div v-if="projectResources.length === 0" class="py-4 text-center text-sm text-text-muted">
          No resources in this project
        </div>
        <button v-for="res in projectResources" :key="res.id" @click="loadResourceContent(res)"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left cursor-pointer w-full">
          <svg class="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-text-primary truncate">{{ res.title || res.name }}</p>
            <p v-if="res.mimeType" class="text-xs text-text-muted">{{ res.mimeType }}</p>
          </div>
        </button>
      </div>
      <!-- Step 2: Content viewer with TOC sidebar -->
      <div v-else class="flex flex-col gap-2 h-full min-h-0">
        <div class="flex items-center gap-2 shrink-0">
          <button @click="pickerSelectedItem = null" class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="flex-1 relative">
            <input v-model="pickerSearch" type="text" placeholder="Search in content..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              @keydown.enter.prevent="navigateSearchResult" />
            <span v-if="pickerSearch.trim() && pickerSearchCount > 0"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
              {{ Math.min(pickerSearchIndex, pickerSearchCount) }}/{{ pickerSearchCount }}
            </span>
          </div>
        </div>
        <p class="text-[10px] text-text-muted shrink-0">Select a fragment of text, or click "Add" for the whole document.</p>
        <div class="flex gap-4 flex-1 min-h-0">
          <!-- Content -->
          <div ref="fragmentContentRef"
            class="flex-1 min-w-0 overflow-y-auto border border-border rounded-lg p-5 text-sm text-text-primary picker-content select-text cursor-text"
            v-html="pickerHighlightedContent"></div>
          <!-- TOC sidebar -->
          <div v-if="pickerHeadings.length > 0" class="w-64 shrink-0 overflow-y-auto border-l border-border pl-4">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Contents</p>
            <div class="flex flex-col gap-1">
              <button v-for="(h, i) in pickerHeadings" :key="i" @click="scrollToHeading(h)"
                class="text-left text-xs px-2 py-1.5 rounded text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                :class="{ 'pl-4': h.tag === 'h2', 'pl-6': h.tag === 'h3', 'pl-8': h.tag === 'h4' }"
                :title="h.text">
                <span class="line-clamp-2">{{ h.text }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <template v-if="pickerSelectedItem" #footer>
        <Button variant="secondary" size="small" @click="showResourcePicker = false; pickerSelectedItem = null">Cancel</Button>
        <Button size="small" @click="confirmFragment('resourceRef')">Add</Button>
      </template>
    </Modal>

    <!-- Image Modal -->
    <Modal v-model="showImageModal" title="Add Image">
      <div class="flex flex-col gap-3">
        <!-- Tabs -->
        <div class="flex gap-1 border-b border-border">
          <button v-for="tab in imageTabs" :key="tab.id" @click="imageTab = tab.id"
            class="px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
            :class="imageTab === tab.id
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary'">
            {{ tab.label }}
          </button>
        </div>

        <!-- URL tab -->
        <div v-if="imageTab === 'url'">
          <input v-model="imageUrl" type="text" placeholder="https://example.com/image.png"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            @keydown.enter="confirmImage" />
        </div>

        <!-- File tab -->
        <div v-if="imageTab === 'file'">
          <label
            class="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent hover:bg-accent-subtle/30 transition-colors">
            <svg class="h-8 w-8 text-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span class="text-sm text-text-muted">Click to select an image</span>
            <input type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
          </label>
        </div>

        <!-- Project resources tab -->
        <div v-if="imageTab === 'project'" class="max-h-48 overflow-y-auto flex flex-col gap-1">
          <div v-if="imageResources.length === 0" class="py-4 text-center text-sm text-text-muted">
            No images in this project
          </div>
          <button v-for="res in imageResources" :key="res.id" @click="selectImageResource(res)"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left cursor-pointer w-full">
            <img :src="getResourceViewUrl(res.id)" alt="" class="w-10 h-10 object-cover rounded border border-border" />
            <span class="text-sm text-text-primary truncate">{{ res.title || res.name }}</span>
          </button>
        </div>

        <!-- Preview -->
        <div v-if="imageUrl" class="rounded-lg border border-border overflow-hidden bg-surface-base">
          <img :src="imageUrl" alt="Preview" class="max-h-40 mx-auto object-contain"
            @error="imagePreviewError = true" @load="imagePreviewError = false" />
          <p v-if="imagePreviewError" class="text-xs text-red-500 text-center py-2">Could not load image</p>
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" size="small" @click="showImageModal = false">Cancel</Button>
        <Button size="small" @click="confirmImage" :disabled="!imageUrl.trim()">Add</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCanvas } from '../services/canvas/useCanvas';
import { useThread } from '../services/threads/useThread';
import { useDocument } from '../services/documents/useDocument';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useResourceList } from '../services/resources/useResourceList';
import { useResource } from '../services/resources/useResource';
import { useProjectStore } from '../store/projectStore';
import CanvasEditor from '../components/canvas/CanvasEditor.vue';
import CanvasToolbar from '../components/canvas/CanvasToolbar.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import Modal from '../components/ui/Modal/Modal.vue';
import type { CanvasData } from '../types/canvas';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const { loadCanvas, saveCanvas, createCanvas, removeCanvas } = useCanvas();
const { loadThread } = useThread();
const { loadDocument } = useDocument();
const { loadDocumentsByProject } = useDocumentProjectList();
const { loadResourcesByProject } = useResourceList();
const { loadResource } = useResource();

const canvasEditorRef = ref(null);
const canvasData = ref<Record<string, any>>({
  name: '',
  canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
});
const thread = ref(null);
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const saveTimeout = ref(null);
const showRemoveModal = ref(false);
const pendingTool = ref<{ type: string; data: Record<string, any> } | null>(null);

// Picker state
const showDocPicker = ref(false);
const showResourcePicker = ref(false);
const showImageModal = ref(false);
const imageUrl = ref('');
const imagePreviewError = ref(false);
const imageTab = ref<'url' | 'file' | 'project'>('url');
const imageResources = ref<Record<string, any>[]>([]);
const editingImageNodeId = ref<string | null>(null);
const projectDocs = ref<Record<string, any>[]>([]);
const projectResources = ref<Record<string, any>[]>([]);
const pickerSelectedItem = ref<{ id: number; name: string; htmlContent: string; type: 'doc' | 'resource' } | null>(null);
const fragmentContentRef = ref<HTMLElement | null>(null);
const pickerSearch = ref('');
const pickerSearchIndex = ref(0);

const pickerSearchCount = computed(() => {
  if (!fragmentContentRef.value || !pickerSearch.value.trim()) return 0;
  return fragmentContentRef.value.querySelectorAll('mark').length;
});

const navigateSearchResult = () => {
  if (!fragmentContentRef.value || !pickerSearch.value.trim()) return;
  const marks = fragmentContentRef.value.querySelectorAll('mark');
  if (marks.length === 0) return;

  // Clear previous active
  marks.forEach((m) => m.classList.remove('ring-2', 'ring-accent'));

  pickerSearchIndex.value = pickerSearchIndex.value % marks.length;
  const target = marks[pickerSearchIndex.value];
  target.classList.add('ring-2', 'ring-accent');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  pickerSearchIndex.value++;
};

watch(pickerSearch, () => {
  pickerSearchIndex.value = 0;
});

const pickerHeadings = computed(() => {
  if (!pickerSelectedItem.value) return [];
  const tmp = document.createElement('div');
  tmp.innerHTML = pickerSelectedItem.value.htmlContent;
  const headings: { text: string; tag: string }[] = [];
  tmp.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) headings.push({ text, tag: el.tagName.toLowerCase() });
  });
  return headings;
});

const pickerHighlightedContent = computed(() => {
  if (!pickerSelectedItem.value) return '';
  const html = pickerSelectedItem.value.htmlContent;
  if (!pickerSearch.value.trim()) return html;
  const term = pickerSearch.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${term})`, 'gi');
  return html.replace(/>([^<]*)</g, (match: string, text: string) => {
    return '>' + text.replace(regex, '<mark class="bg-amber-200/60 rounded px-0.5">$1</mark>') + '<';
  });
});

const scrollToHeading = (heading: { text: string }) => {
  if (!fragmentContentRef.value) return;
  const els = fragmentContentRef.value.querySelectorAll('h1, h2, h3, h4');
  for (const el of els) {
    if (el.textContent?.trim() === heading.text) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
  }
};

const imageTabs = [
  { id: 'url' as const, label: 'URL' },
  { id: 'file' as const, label: 'Local file' },
  { id: 'project' as const, label: 'Project' },
];

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const getResourceViewUrl = (id: number) => `${apiBaseUrl}/resources/${id}/view`;

const isNewCanvas = computed(() => route.params.id === 'new');

const breadcrumbItems = computed(() => {
  const items = [];
  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject.id}`,
  });
  if (thread.value) {
    items.push({
      name: thread.value.name,
      path: `/thread/${thread.value.id}`,
    });
  }
  items.push({
    name: isNewCanvas.value ? 'New Canvas' : canvasData.value.name || 'Canvas',
  });
  return items;
});

onMounted(async () => {
  const id = route.params.id;

  if (!isNewCanvas.value) {
    canvasData.value = await loadCanvas(String(id));
  }

  let threadId: string | number | undefined = route.query.threadId || canvasData.value?.thread;
  let projectId: string | number | undefined = route.query.projectId || projectStore.currentProject.id;

  try {
    if (threadId) {
      thread.value = await loadThread(threadId);
      if (thread.value && thread.value.project) {
        projectId = thread.value.project;
      }
    }
  } catch (error) {
    console.error('Error loading hierarchy data for breadcrumbs:', error);
  }

  if (isNewCanvas.value) {
    canvasData.value = {
      name: '',
      canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      thread: threadId ? Number(threadId) : null,
      project: projectId ? Number(projectId) : null,
    };
  }
});

const handleCanvasChange = (data: CanvasData) => {
  if (!canvasData.value.name) return;

  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }

  isSaving.value = true;
  savedSuccessfully.value = false;

  saveTimeout.value = setTimeout(async () => {
    try {
      canvasData.value.canvasData = data;

      if (isNewCanvas.value) {
        const created = await createCanvas(canvasData.value);
        canvasData.value.id = created.id;
        router.replace(`/canvas/${created.id}`);
      } else {
        await saveCanvas(canvasData.value.id, { canvasData: data });
      }
      savedSuccessfully.value = true;
    } catch (error) {
      console.error('Error saving canvas:', error);
    } finally {
      isSaving.value = false;
      setTimeout(() => {
        savedSuccessfully.value = false;
      }, 3000);
    }
  }, 1000);
};

const handleNameChange = () => {
  if (!canvasData.value.name || isNewCanvas.value) return;
  saveCanvas(canvasData.value.id, { name: canvasData.value.name });
};

const onSelectTool = (tool: string, data: Record<string, any>) => {
  pendingTool.value = { type: tool, data };
};

const handleAddNode = (type: string, data: Record<string, any>) => {
  if (canvasEditorRef.value) {
    canvasEditorRef.value.addNode(type, data);
  }
};

const handleExport = () => {
  canvasEditorRef.value?.exportAsImage();
};

// Document picker
const openDocPicker = async () => {
  pickerSelectedItem.value = null;
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      projectDocs.value = await loadDocumentsByProject(projectId);
    } catch {
      projectDocs.value = [];
    }
  }
  showDocPicker.value = true;
};

const loadDocContent = async (doc: Record<string, any>) => {
  pickerSearch.value = '';
  try {
    const full = await loadDocument(String(doc.id));
    pickerSelectedItem.value = {
      id: doc.id,
      name: doc.name,
      htmlContent: (full as any).content || '<p>No content</p>',
      type: 'doc',
    };
  } catch {
    pickerSelectedItem.value = {
      id: doc.id,
      name: doc.name,
      htmlContent: '<p>Could not load content</p>',
      type: 'doc',
    };
  }
};

const loadResourceContent = async (res: Record<string, any>) => {
  pickerSearch.value = '';
  try {
    const full = await loadResource(String(res.id));
    pickerSelectedItem.value = {
      id: res.id,
      name: res.title || res.name,
      htmlContent: full.content || '<p>No content</p>',
      type: 'resource',
    };
  } catch {
    pickerSelectedItem.value = {
      id: res.id,
      name: res.title || res.name,
      htmlContent: '<p>Could not load content</p>',
      type: 'resource',
    };
  }
};

const getSelectedText = (): string => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  if (!fragmentContentRef.value?.contains(range.commonAncestorContainer)) return '';
  return selection.toString().trim();
};

const confirmFragment = (nodeType: 'docRef' | 'resourceRef') => {
  if (!pickerSelectedItem.value) return;
  const selected = getSelectedText();
  const title = selected || pickerSelectedItem.value.name;

  const data: Record<string, any> = {
    title,
    ...(nodeType === 'docRef'
      ? { docId: pickerSelectedItem.value.id }
      : { resourceId: pickerSelectedItem.value.id }),
    sourceName: pickerSelectedItem.value.name,
  };

  let style: Record<string, any> | undefined;
  if (selected) {
    const len = selected.length;
    const width = Math.max(160, Math.min(320, len * 3 + 50));
    const lines = Math.ceil(len / (width / 7));
    const height = Math.max(50, lines * 18 + 40);
    style = { width: `${width}px`, height: `${height}px` };
  }

  if (canvasEditorRef.value) {
    canvasEditorRef.value.addNode(nodeType, data, style);
  }
  showDocPicker.value = false;
  showResourcePicker.value = false;
  pickerSelectedItem.value = null;
};

// Image modal
const openImageModal = async () => {
  editingImageNodeId.value = null;
  imageUrl.value = '';
  imagePreviewError.value = false;
  imageTab.value = 'url';
  // Load image resources from project
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      const all = await loadResourcesByProject(projectId);
      imageResources.value = all.filter((r: Record<string, any>) =>
        r.mimeType && r.mimeType.startsWith('image/')
      );
    } catch {
      imageResources.value = [];
    }
  }
  showImageModal.value = true;
};

const confirmImage = () => {
  if (!imageUrl.value.trim()) return;
  if (editingImageNodeId.value) {
    canvasEditorRef.value?.updateNodeData(editingImageNodeId.value, { src: imageUrl.value.trim() });
    editingImageNodeId.value = null;
  } else {
    handleAddNode('image', { src: imageUrl.value.trim(), alt: 'Image' });
  }
  imageUrl.value = '';
  showImageModal.value = false;
};

const handleEditImage = async (nodeId: string, currentSrc: string) => {
  editingImageNodeId.value = nodeId;
  imageUrl.value = currentSrc;
  imagePreviewError.value = false;
  imageTab.value = 'url';
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      const all = await loadResourcesByProject(projectId);
      imageResources.value = all.filter((r: Record<string, any>) =>
        r.mimeType && r.mimeType.startsWith('image/')
      );
    } catch {
      imageResources.value = [];
    }
  }
  showImageModal.value = true;
};

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    imageUrl.value = reader.result as string;
  };
  reader.readAsDataURL(file);
};

const selectImageResource = (res: Record<string, any>) => {
  imageUrl.value = getResourceViewUrl(res.id);
};

// Resource picker
const openResourcePicker = async () => {
  pickerSelectedItem.value = null;
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      projectResources.value = await loadResourcesByProject(projectId);
    } catch {
      projectResources.value = [];
    }
  }
  showResourcePicker.value = true;
};


const removeCanvasConfirm = () => {
  showRemoveModal.value = true;
};

const handleRemoveConfirm = async () => {
  showRemoveModal.value = false;
  if (!canvasData.value.id) return;
  try {
    await removeCanvas(canvasData.value.id);
    if (thread.value) {
      router.push(`/thread/${thread.value.id}`);
    } else {
      router.push(`/project/${projectStore.currentProject.id}`);
    }
  } catch (error) {
    console.error('Failed to remove canvas:', error);
  }
};
</script>

<style>
.picker-content h1 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 1em 0 0.5em;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: 0.3em;
}
.picker-content h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0.8em 0 0.4em;
  color: var(--color-text-primary);
}
.picker-content h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0.7em 0 0.3em;
  color: var(--color-text-primary);
}
.picker-content h4 {
  font-size: 1em;
  font-weight: 600;
  margin: 0.6em 0 0.25em;
  color: var(--color-text-secondary);
}
.picker-content p {
  margin: 0.5em 0;
  line-height: 1.6;
}
.picker-content ul, .picker-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.picker-content ul { list-style-type: disc; }
.picker-content ol { list-style-type: decimal; }
.picker-content li {
  margin: 0.25em 0;
  line-height: 1.5;
}
.picker-content blockquote {
  border-left: 3px solid var(--color-accent, #6366f1);
  margin: 0.75em 0;
  padding: 0.5em 1em;
  color: var(--color-text-secondary);
  background: var(--color-surface-hover);
  border-radius: 0 0.375rem 0.375rem 0;
}
.picker-content pre {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  padding: 0.75em 1em;
  margin: 0.75em 0;
  overflow-x: auto;
  font-size: 0.85em;
}
.picker-content code {
  background: var(--color-surface-hover);
  border-radius: 0.25rem;
  padding: 0.15em 0.35em;
  font-size: 0.9em;
}
.picker-content pre code {
  background: none;
  padding: 0;
}
.picker-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  font-size: 0.9em;
}
.picker-content th, .picker-content td {
  border: 1px solid var(--color-border);
  padding: 0.4em 0.75em;
  text-align: left;
}
.picker-content th {
  background: var(--color-surface-hover);
  font-weight: 600;
}
.picker-content a {
  color: var(--color-accent, #6366f1);
  text-decoration: underline;
}
.picker-content img {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 0.5em 0;
}
.picker-content hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}
.picker-content > *:first-child {
  margin-top: 0;
}
</style>
