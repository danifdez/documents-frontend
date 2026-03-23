<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Top bar: breadcrumb + document name -->
    <div class="flex-shrink-0 pb-3">
      <Breadcrumb :items="breadcrumbItems" />
      <div class="flex items-center gap-3 mt-1">
        <input id="docName" v-model="docData.name" type="text" required placeholder="Document name..."
          class="flex-1 px-4 py-2 bg-transparent border-0 border-b border-border text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors tracking-tight" />
        <Button v-if="!isNewDocument" variant="danger" size="small" @click="removeDoc">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </Button>
      </div>
    </div>

    <!-- Editor + Split/Sidebar -->
    <div class="flex-1 min-h-0 flex gap-4"
      :class="{ 'ring-2 ring-accent/30 ring-inset rounded-lg': isDragOver }"
      @dragover="onDragOver" @dragenter="onDragEnter" @dragleave="onDragLeave" @drop="onDrop">

      <!-- Editor area -->
      <div class="flex-1 min-w-0 flex flex-col min-h-0">
        <EditorContent ref="editorContentRef" :content="docData?.content" :isSaving="isSaving"
          :savedSuccessfully="savedSuccessfully" :show-toc="showToc" @content-change="handleEditorContentChange"
          @toggle-comments="toggleComments" @highlight-comment="highlightComment"
          @comment-created="refreshCommentSidebar" />
      </div>

      <!-- Split View: Dropped Document -->
      <div v-if="splitViewActive && splitDocument"
        class="flex-shrink-0 w-[400px] flex flex-col min-h-0">
        <div class="bg-surface-elevated rounded-xl border border-border flex-shrink-0">
          <div class="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <span class="text-sm font-semibold text-text-primary truncate flex-1">{{ splitDocument.name }}</span>
            <div class="flex items-center gap-1 shrink-0 ml-2">
              <router-link :to="`/document/${splitDocument.id}`"
                class="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
                title="Open document">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </router-link>
              <button @click="closeSplitView"
                class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="overflow-y-auto flex-1 min-h-0 mt-3 bg-surface-elevated rounded-xl border border-border p-4">
          <EditorContent ref="splitEditorRef" :content="splitDocument.content || ''"
            :is-saving="false" :saved-successfully="false" />
        </div>
      </div>

      <!-- Split View: Dropped Resource -->
      <div v-if="splitViewActive && splitResource"
        class="flex-shrink-0 w-[400px] flex flex-col min-h-0">
        <div class="bg-surface-elevated rounded-xl border border-border flex-shrink-0">
          <div class="flex items-center justify-between px-4 py-3 border-b border-border-light">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <IconType :mimeType="splitResource.mimeType" />
              <span class="text-sm font-semibold text-text-primary truncate">{{ splitResource.name }}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0 ml-2">
              <router-link :to="`/resource/${splitResource.id}`"
                class="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors"
                title="Open resource">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </router-link>
              <button @click="closeSplitView"
                class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div class="overflow-y-auto flex-1 min-h-0 mt-3 bg-surface-elevated rounded-xl border border-border p-4">
          <div v-if="splitResource.content" class="prose max-w-none text-sm" v-html="splitResource.content"></div>
          <div v-else class="flex items-center justify-center py-12 text-sm text-text-muted">
            No extracted content available
          </div>
        </div>
      </div>

      <!-- Sidebar (TOC/Comments) - hidden when split view is active -->
      <div v-if="!isNewDocument && !splitViewActive" class="flex-shrink-0 w-[280px] flex flex-col min-h-0">
        <div class="flex items-center gap-1 mb-3 flex-shrink-0">
          <ButtonGroup>
            <Button variant="secondary" size="small" :active="viewSideBar === 'toc'"
              @click="(viewSideBar = 'toc', refreshTocFromChild())">
              TOC
            </Button>
            <Button variant="secondary" size="small" :active="viewSideBar === 'comments'"
              @click="viewSideBar = 'comments'">
              Comments
            </Button>
          </ButtonGroup>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <CommentSidebar v-if="viewSideBar === 'comments'" ref="commentSidebarRef"
            :doc-id="String(route.params.id)" @comment-clicked="findAndHighlightCommentMark"
            @comment-deleted="removeCommentMark" />
          <TableOfContents v-else-if="viewSideBar === 'toc'" ref="tocRef" :editor="editorContentRef?.editor"
            @scroll-to="scrollToPosition" />
        </div>
      </div>
    </div>

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
import { useDragDrop } from '../composables/useDragDrop';
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EditorContent from '../components/editor/EditorContent.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import { useProjectStore } from '../store/projectStore';
import CommentSidebar from '../components/comments/CommentSidebar.vue';
import TableOfContents from '../components/editor/TableOfContents.vue';
import Button from '../components/ui/Button.vue';
import ButtonGroup from '../components/ui/ButtonGroup.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import IconType from '../components/resources/IconType.vue';

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
const viewSideBar = ref<'toc' | 'comments' | 'hidden'>(isNewDocument.value ? 'hidden' : 'toc');
const showToc = computed(() => viewSideBar.value === 'toc');
const tocRef = ref(null);
const showRemoveDocModal = ref(false);

// Split view state
const splitViewActive = ref(false);
const splitDocument = ref<Record<string, any> | null>(null);
const splitResource = ref<Record<string, any> | null>(null);

const closeSplitView = () => {
  splitViewActive.value = false;
  splitDocument.value = null;
  splitResource.value = null;
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
    path: `/project/${projectStore.currentProject.id}`
  });

  if (thread.value) {
    items.push({
      name: thread.value.name,
      path: `/thread/${thread.value.id}`
    });
  }

  if (isNewDocument.value) {
    items.push({
      name: 'New Document'
    });
  } else if (docData.value) {
    items.push({
      name: docData.value.name
    });
  }

  return items;
});

const loadDocumentData = async () => {
  const id = route.params.id;

  docData.value = { name: '', content: '' };
  thread.value = null;
  closeSplitView();

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
      commentMark.style.backgroundColor = 'rgba(255, 215, 0, 0.6)';
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
};

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
  if (viewSideBar.value === 'comments' && commentSidebarRef.value) {
    // Force remount by toggling
    viewSideBar.value = 'hidden';
    nextTick(() => {
      viewSideBar.value = 'comments';
    });
  }
};


</script>
