<template>
  <div>
    <Breadcrumb :items="breadcrumbItems" />
    <div>
      <div class="relative mb-4 flex items-center gap-2">
        <input id="docName" v-model="docData.name" type="text" required
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        <Button v-if="!isNewDocument" variant="danger" @click="removeDoc">Remove Document</Button>
      </div>
      <div class="mt-5 h-[500px]">
        <div class="flex w-full">
          <div class="flex flex-col flex-grow">
            <EditorContent ref="editorContentRef" :content="docData?.content" :isSaving="isSaving"
              :savedSuccessfully="savedSuccessfully" :show-toc="showToc" @content-change="handleEditorContentChange"
              @toggle-comments="toggleComments" @highlight-comment="highlightComment" />
          </div>
          <div v-if="!isNewDocument" class="ml-4 flex-shrink-0 w-[300px] min-w-[250px]">
            <div class="flex justify-end mb-2">
              <ButtonGroup>
                <Button variant="secondary" :active="viewSideBar === 'toc'"
                  @click="(viewSideBar = 'toc', refreshTocFromChild())">
                  TOC
                </Button>
                <Button variant="secondary" :active="viewSideBar === 'comments'" @click="viewSideBar = 'comments'">
                  Comments
                </Button>
              </ButtonGroup>
            </div>

            <CommentSidebar v-if="viewSideBar === 'comments'" ref="commentSidebarRef" :doc-id="String(route.params.id)"
              @comment-clicked="findAndHighlightCommentMark" @comment-deleted="removeCommentMark" />
            <TableOfContents v-else-if="viewSideBar === 'toc'" ref="tocRef" :editor="editorContentRef?.editor"
              @scroll-to="scrollToPosition" />
          </div>
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
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EditorContent from '../components/editor/EditorContent.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import { useProjectStore } from '../store/projectStore';
import CommentSidebar from '../components/comments/CommentSidebar.vue';
import TableOfContents from '../components/editor/TableOfContents.vue';
import Button from '../components/ui/Button.vue';
import ButtonGroup from '../components/ui/ButtonGroup.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';

const htmlContent = ref('');
const editorContentRef = ref<any>(null);
const docData = ref<any>({ name: '', content: '' });
const route = useRoute();
const router = useRouter();
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const saveTimeout = ref(null);
const { loadDocument, saveDocument, createDocument, removeDocument } = useDocument();
const { loadThread } = useThread();
const thread = ref(null);
const projectStore = useProjectStore();
const isNewDocument = computed(() => route.params.id === 'new');
const viewSideBar = ref<'toc' | 'comments' | 'hidden'>(isNewDocument.value ? 'hidden' : 'toc');
const showToc = computed(() => viewSideBar.value === 'toc');
const tocRef = ref(null);
const showRemoveDocModal = ref(false);

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

onMounted(async () => {
  const id = route.params.id;

  if (!isNewDocument.value) {
    docData.value = await loadDocument(String(id));
  }

  let threadId: any = route.query.threadId || docData.value?.thread;
  let projectId: any = route.query.projectId || projectStore.currentProject.id;

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

    doc.descendants((node: any, pos: number) => {
      if (result) return false;

      const marks = (node.marks as any[]).filter(
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

    doc.descendants((node: any, pos: number) => {
      if (result) return false;

      const marks = (node.marks as any[]).filter(
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
</script>
