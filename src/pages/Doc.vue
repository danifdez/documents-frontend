<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Loading state -->
    <div v-if="isLoadingDocument" class="flex-1 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>

    <template v-else>
      <!-- Top bar: breadcrumb + document name -->
      <div class="flex-shrink-0 pb-3">
        <Breadcrumb :items="breadcrumbItems" />
        <div class="flex items-center gap-3 mt-1">
          <input id="docName" v-model="docData.name" type="text" required placeholder="Document name..."
            class="flex-1 px-4 py-2 bg-transparent border-0 border-b border-border text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent hover:border-text-muted transition-colors tracking-tight rounded-t-md focus:bg-surface-hover/50" />
          <div class="flex items-center gap-2">
            <Button v-if="!isNewDocument" variant="secondary" size="small" @click="exportDocx"
              :disabled="exportingDocx" title="Export as Word document (.docx)">
              <svg v-if="exportingDocx" class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span class="hidden sm:inline">DOCX</span>
            </Button>
            <Button v-if="!isNewDocument" variant="secondary" size="small" @click="exportPdf"
              :disabled="exportingPdf" title="Export as PDF">
              <svg v-if="exportingPdf" class="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none"
                viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span class="hidden sm:inline">PDF</span>
            </Button>
            <Button v-if="!isNewDocument" variant="danger" size="small" @click="removeDoc"
              title="Remove document (Del)">
              <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span class="hidden sm:inline">Remove</span>
            </Button>
          </div>
        </div>
      </div>

      <!-- Editor + Split/Sidebar -->
      <div class="flex-1 min-h-0 flex gap-4 relative"
        :class="{ 'drag-overlay-active': isDragOver }" @dragover="onDragOver" @dragenter="onDragEnter"
        @dragleave="onDragLeave" @drop="onDrop">

        <!-- Drag overlay -->
        <Transition name="fade">
          <div v-if="isDragOver"
            class="absolute inset-0 z-20 rounded-lg border-2 border-dashed border-accent bg-accent/5 flex items-center justify-center pointer-events-none">
            <div class="flex flex-col items-center gap-2 text-accent">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-sm font-medium">Drop document or resource to open in split view</span>
            </div>
          </div>
        </Transition>

        <!-- Editor area -->
        <div class="flex-1 min-w-0 flex flex-col min-h-0">
          <!-- Empty state for new documents -->
          <div v-if="isNewDocument && !docData.name && !htmlContent"
            class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div class="text-center pointer-events-none opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto text-text-muted mb-3" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-sm text-text-muted font-medium">Start by naming your document above</p>
              <p class="text-xs text-text-muted mt-1">Then begin writing here</p>
            </div>
          </div>
          <EditorContent ref="editorContentRef" :content="docData?.content" :isSaving="isSaving"
            :savedSuccessfully="savedSuccessfully" :show-toc="showToc" @content-change="handleEditorContentChange"
            @toggle-comments="toggleComments" @highlight-comment="highlightComment"
            @comment-created="refreshCommentSidebar" />
        </div>

        <!-- Split View: Dropped Document -->
        <div v-if="splitViewActive && splitDocument"
          class="flex-shrink-0 w-full sm:w-[320px] lg:w-[400px] flex flex-col min-h-0">
          <div class="bg-surface-elevated rounded-xl border border-accent/20 flex-shrink-0">
            <div class="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span
                  class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-accent" title="Split view panel"></span>
                <span class="text-sm font-semibold text-text-primary truncate">{{ splitDocument.name }}</span>
              </div>
              <SplitViewActions :link-to="`/document/${splitDocument.id}`" link-title="Open document"
                @close="closeSplitView" @swap="swapSplitDocument" />
            </div>
          </div>
          <div class="overflow-y-auto flex-1 min-h-0 mt-3 bg-surface-elevated rounded-xl border border-border p-4">
            <EditorContent ref="splitEditorRef" :content="splitDocument.content || ''" :is-saving="false"
              :saved-successfully="false" />
          </div>
        </div>

        <!-- Split View: Dropped Resource -->
        <div v-if="splitViewActive && splitResource"
          class="flex-shrink-0 w-full sm:w-[320px] lg:w-[400px] flex flex-col min-h-0">
          <div class="bg-surface-elevated rounded-xl border border-accent/20 flex-shrink-0">
            <div class="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <IconType :mimeType="splitResource.mimeType" />
                <span class="text-sm font-semibold text-text-primary truncate">{{ splitResource.name }}</span>
              </div>
              <SplitViewActions :link-to="`/resource/${splitResource.id}`" link-title="Open resource"
                @close="closeSplitView" />
            </div>
          </div>
          <div class="overflow-y-auto flex-1 min-h-0 mt-3 bg-surface-elevated rounded-xl border border-border p-4">
            <div v-if="splitResource.content" class="prose max-w-none text-sm" v-html="splitResource.content"></div>
            <div v-else class="flex items-center justify-center py-12 text-sm text-text-muted">
              No extracted content available
            </div>
          </div>
        </div>

        <!-- Sidebar (TOC/Comments) -->
        <div v-if="!isNewDocument && showSidebar"
          class="flex-shrink-0 w-[280px] flex-col min-h-0 hidden lg:flex"
          :class="{ 'absolute right-0 top-0 bottom-0 z-30 bg-surface shadow-lg rounded-xl p-3 lg:relative lg:shadow-none lg:p-0 lg:bg-transparent': splitViewActive }">
          <div class="flex items-center gap-1 mb-3 flex-shrink-0">
            <ButtonGroup>
              <Button variant="secondary" size="small" :active="viewSideBar === 'toc'"
                @click="(viewSideBar = 'toc', refreshTocFromChild())" title="Table of Contents">
                TOC
              </Button>
              <Button variant="secondary" size="small" :active="viewSideBar === 'comments'"
                @click="viewSideBar = 'comments'" title="Comments">
                Comments
                <Badge v-if="commentCount > 0" variant="accent" class="ml-1.5 !py-0 !px-1.5 text-[10px]">
                  {{ commentCount }}
                </Badge>
              </Button>
              <Button variant="secondary" size="small" :active="viewSideBar === 'search'"
                @click="viewSideBar = 'search'" title="Search related content">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </Button>
            </ButtonGroup>
            <!-- Close sidebar button when floating over split view -->
            <button v-if="splitViewActive"
              class="ml-auto p-1 rounded text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              @click="showSidebar = false">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto">
            <CommentSidebar v-if="viewSideBar === 'comments'" ref="commentSidebarRef"
              :doc-id="String(route.params.id)" @comment-clicked="findAndHighlightCommentMark"
              @comment-deleted="removeCommentMark" @comment-added="loadCommentCount" />
            <TableOfContents v-else-if="viewSideBar === 'toc'" ref="tocRef" :editor="editorContentRef?.editor"
              @scroll-to="scrollToPosition" />
            <SemanticSearchPanel v-else-if="viewSideBar === 'search'"
              :project-id="projectStore.currentProject?.id"
              @insert-link="insertSearchResultLink" />
          </div>
        </div>

        <!-- Floating sidebar toggle for mobile or when sidebar is hidden -->
        <button v-if="!isNewDocument && (!showSidebar || splitViewActive)"
          class="fixed bottom-4 right-4 lg:absolute lg:bottom-2 lg:right-2 z-20 p-2.5 bg-accent text-white rounded-full shadow-lg hover:bg-accent-dark transition-colors cursor-pointer"
          :class="{ 'hidden': showSidebar && !splitViewActive }"
          @click="showSidebar = !showSidebar" title="Toggle sidebar (TOC/Comments)">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>
    </template>

    <!-- Confirm Modal -->
    <ConfirmModal :is-open="showRemoveDocModal" title="Remove Document"
      message="Are you sure you want to remove this document?" confirm-text="Remove" cancel-text="Cancel"
      confirm-variant="danger" @confirm="handleRemoveDocConfirm" @cancel="handleRemoveDocCancel" />
  </div>
</template>

<script setup lang="ts">
import { useDocument } from '../services/documents/useDocument';
import { useThread } from '../services/threads/useThread';
import { useResource } from '../services/resources/useResource';
import { useCommentList } from '../services/comments/useCommentList';
import { useDragDrop } from '../composables/useDragDrop';
import apiClient from '../services/api';
import { ref, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EditorContent from '../components/editor/EditorContent.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import { useProjectStore } from '../store/projectStore';
import CommentSidebar from '../components/comments/CommentSidebar.vue';
import TableOfContents from '../components/editor/TableOfContents.vue';
import Button from '../components/ui/Button.vue';
import ButtonGroup from '../components/ui/ButtonGroup.vue';
import Badge from '../components/ui/Badge.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import IconType from '../components/resources/IconType.vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import SplitViewActions from '../components/doc/SplitViewActions.vue';
import SemanticSearchPanel from '../components/doc/SemanticSearchPanel.vue';

const htmlContent = ref('');
const editorContentRef = ref(null);
const splitEditorRef = ref(null);
const docData = ref<Record<string, any>>({ name: '', content: '' });
const route = useRoute();
const router = useRouter();
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const saveTimeout = ref(null);
const { loadDocument, saveDocument, createDocument, removeDocument } = useDocument();
const { loadThread } = useThread();
const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave, handleDrop } = useDragDrop();
const thread = ref(null);
const projectStore = useProjectStore();
const isNewDocument = computed(() => route.params.id === 'new');
const viewSideBar = ref<'toc' | 'comments' | 'search' | 'hidden'>(isNewDocument.value ? 'hidden' : 'toc');
const showToc = computed(() => viewSideBar.value === 'toc');
const tocRef = ref(null);
const showRemoveDocModal = ref(false);
const isLoadingDocument = ref(false);
const showSidebar = ref(!isNewDocument.value);

// Comment count
const commentCount = ref(0);
const { comments: commentListData, loadComments: fetchComments } = useCommentList();

const loadCommentCount = async () => {
  if (isNewDocument.value) return;
  try {
    await fetchComments(String(route.params.id), 'doc');
    commentCount.value = commentListData.value.length;
  } catch {
    commentCount.value = 0;
  }
};

// Split view state
const splitViewActive = ref(false);
const splitDocument = ref<Record<string, any> | null>(null);
const splitResource = ref<Record<string, any> | null>(null);

const closeSplitView = () => {
  splitViewActive.value = false;
  splitDocument.value = null;
  splitResource.value = null;
};

const swapSplitDocument = async () => {
  if (!splitDocument.value || isNewDocument.value) return;

  const currentDocId = docData.value.id;
  const currentDocData = { ...docData.value };
  const splitDocId = splitDocument.value.id;

  // Navigate to the split document's page
  router.push(`/document/${splitDocId}`);

  // Set the current doc as the new split view
  splitDocument.value = currentDocData;
  splitViewActive.value = true;
};

// Drag-and-drop handlers
const onDragOver = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  handleDragOver(event);
};

const onDragEnter = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  handleDragEnter(event);
};

const onDragLeave = (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();
  handleDragLeave(event);
};

const onDrop = async (event: DragEvent) => {
  event.preventDefault();
  event.stopPropagation();

  const droppedData = handleDrop(event);

  if (droppedData && droppedData.type === 'document') {
    try {
      const document = droppedData.document;
      if (document && document.id && String(document.id) !== String(route.params.id)) {
        const fullDocument = await loadDocument(document.id);
        splitResource.value = null;
        splitDocument.value = fullDocument;
        splitViewActive.value = true;
      }
    } catch (error) {
      console.error('Failed to load document for split view:', error);
    }
  } else if (droppedData && droppedData.type === 'resource') {
    try {
      const droppedResource = droppedData.resource;
      if (droppedResource && droppedResource.id) {
        const { loadResource } = useResource();
        const fullResource = await loadResource(String(droppedResource.id));
        splitDocument.value = null;
        splitResource.value = fullResource;
        splitViewActive.value = true;
      }
    } catch (error) {
      console.error('Failed to load resource for split view:', error);
    }
  }
};

const toggleComments = (value?: boolean) => {
  if (typeof value === 'boolean') {
    viewSideBar.value = value ? 'comments' : 'hidden';
  } else {
    viewSideBar.value = viewSideBar.value === 'comments' ? 'hidden' : 'comments';
  }
};

const refreshTocFromChild = () => {
  try {
    if (tocRef.value && typeof tocRef.value.extractHeadings === 'function') {
      tocRef.value.extractHeadings();
    }
  } catch (e) {
    // ignore
  }
};

watch(viewSideBar, (newVal) => {
  if (newVal === 'toc') refreshTocFromChild();
});

const breadcrumbItems = computed(() => {
  const items = [];

  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject.id}`,
    icon: 'project'
  });

  if (thread.value) {
    items.push({
      name: thread.value.name,
      path: `/thread/${thread.value.id}`,
      icon: 'thread'
    });
  }

  if (isNewDocument.value) {
    items.push({
      name: 'New Document',
      icon: 'document'
    });
  } else if (docData.value) {
    items.push({
      name: docData.value.name,
      icon: 'document'
    });
  }

  return items;
});

const loadDocumentData = async () => {
  const id = route.params.id;

  isLoadingDocument.value = true;
  docData.value = { name: '', content: '' };
  thread.value = null;
  closeSplitView();

  try {
    if (!isNewDocument.value) {
      docData.value = await loadDocument(String(id));
    }

    let threadId: string | number | undefined = route.query.threadId || docData.value?.thread;
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

    if (isNewDocument.value) {
      docData.value = {
        name: '',
        content: '',
        thread: threadId ? Number(threadId) : null,
        project: projectId ? Number(projectId) : null
      };
    }

    htmlContent.value = docData.value.content;
  } finally {
    isLoadingDocument.value = false;
  }

  // Load comment count after document is ready
  loadCommentCount();
};

onMounted(loadDocumentData);

watch(() => route.params.id, (newId, oldId) => {
  if (newId !== oldId && route.path.startsWith('/document/')) {
    loadDocumentData();
  }
});

const handleEditorContentChange = (content: string) => {
  if (!docData.value.name) {
    return;
  }

  htmlContent.value = content;

  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }

  isSaving.value = true;
  savedSuccessfully.value = false;

  saveTimeout.value = setTimeout(async () => {
    if (docData.value && htmlContent.value !== docData.value.content) {
      try {
        docData.value.content = htmlContent.value;

        if (isNewDocument.value) {
          await createDocument(docData.value);
        } else {
          await saveDocument(docData.value.id, { content: htmlContent.value });
        }
        savedSuccessfully.value = true;
      } catch (error) {
        console.error('Error saving document:', error);
      } finally {
        isSaving.value = false;

        setTimeout(() => {
          savedSuccessfully.value = false;
        }, 3000);
      }
    } else {
      isSaving.value = false;
    }
  }, 1000);
};

// Keyboard shortcuts
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (docData.value.name && htmlContent.value !== docData.value.content) {
      handleEditorContentChange(htmlContent.value);
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// -- Search result link insertion --
const insertSearchResultLink = (result: any) => {
  if (!editorContentRef.value || !editorContentRef.value.editor) return;
  const editor = editorContentRef.value.editor;
  const url = `/document/${result.id}`;
  editor.chain().focus().setLink({ href: url }).insertContent(result.name).run();
};

const commentSidebarRef = ref(null);

const highlightComment = (commentId: string) => {
  if (commentSidebarRef.value) {
    commentSidebarRef.value.highlightComment(commentId);
  }
};

const findAndHighlightCommentMark = (commentId: string) => {
  if (!editorContentRef.value || !editorContentRef.value.editor) return;

  const editor = editorContentRef.value.editor;
  const doc = editor.state.doc;

  const findCommentMarkPosition = (doc: any): { from: number; to: number } | null => {
    let result: { from: number; to: number } | null = null;

    doc.descendants((node: Record<string, any>, pos: number) => {
      if (result) return false;

      const marks = (node.marks as Record<string, any>[]).filter(
        (mark: any) => mark.type.name === 'comment' && mark.attrs.commentId === commentId
      );

      if (marks.length > 0) {
        result = {
          from: pos,
          to: pos + node.nodeSize
        };
        return false;
      }

      return true;
    });

    return result;
  };

  const position = findCommentMarkPosition(doc);

  if (position) {
    editor.commands.setTextSelection(position);
    editor.chain().focus().run();

    const commentMark = document.querySelector(`span[data-comment-id="${commentId}"]`) as HTMLElement | null;
    if (commentMark) {
      commentMark.style.backgroundColor = 'var(--color-accent-subtle, rgba(99, 102, 241, 0.2))';
      commentMark.style.transition = 'background-color 0.5s ease';

      setTimeout(() => {
        commentMark.style.backgroundColor = '';
      }, 2000);
    }
  }
};

const removeCommentMark = (commentId: string) => {
  if (!editorContentRef.value || !editorContentRef.value.editor) return;

  const editor = editorContentRef.value.editor;
  const doc = editor.state.doc;

  const findCommentMarkPosition = (doc: any): { from: number; to: number } | null => {
    let result: { from: number; to: number } | null = null;

    doc.descendants((node: Record<string, any>, pos: number) => {
      if (result) return false;

      const marks = (node.marks as Record<string, any>[]).filter(
        (mark: any) => mark.type.name === 'comment' && mark.attrs.commentId === commentId
      );

      if (marks.length > 0) {
        result = {
          from: pos,
          to: pos + node.nodeSize
        };
        return false;
      }

      return true;
    });

    return result;
  };

  const position = findCommentMarkPosition(doc);

  if (position) {
    editor.commands.setTextSelection({ from: position.from, to: position.to });
    editor.commands.unsetComment();
    handleEditorContentChange(editor.getHTML());
  }

  // Update comment count
  loadCommentCount();
};

// Export to DOCX / PDF
const exportingDocx = ref(false);
const exportingPdf = ref(false);

const exportDoc = async (format: 'docx' | 'pdf') => {
  if (!docData.value.id) return;
  const isDocx = format === 'docx';
  const refFlag = isDocx ? exportingDocx : exportingPdf;
  refFlag.value = true;
  try {
    const response = await apiClient.get(`/docs/${docData.value.id}/export/${format}`, {
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'];
    let filename = `${docData.value.name || 'document'}.${format}`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match) filename = match[1];
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(`Failed to export document as ${format.toUpperCase()}:`, error);
  } finally {
    refFlag.value = false;
  }
};

const exportDocx = () => exportDoc('docx');
const exportPdf = () => exportDoc('pdf');

const removeDoc = async () => {
  if (!docData.value.id) return;
  showRemoveDocModal.value = true;
};

const handleRemoveDocConfirm = async () => {
  showRemoveDocModal.value = false;
  if (!docData.value.id) return;
  try {
    await removeDocument(docData.value.id);
    if (thread.value) {
      router.push(`/thread/${thread.value.id}`);
    } else {
      router.push(`/project/${projectStore.currentProject.id}`);
    }
  } catch (error) {
    console.error('Failed to remove document:', error);
  }
};

const handleRemoveDocCancel = () => {
  showRemoveDocModal.value = false;
};

const scrollToPosition = (position: number) => {
  if (editorContentRef.value && editorContentRef.value.scrollToPosition) {
    editorContentRef.value.scrollToPosition(position);
  }
};

// -- Comment sidebar refresh --
const refreshCommentSidebar = () => {
  loadCommentCount();
  if (viewSideBar.value === 'comments' && commentSidebarRef.value) {
    // Force remount by toggling
    viewSideBar.value = 'hidden';
    nextTick(() => {
      viewSideBar.value = 'comments';
    });
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
