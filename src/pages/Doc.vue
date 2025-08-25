<template>
  <div>
    <Breadcrumb :items="breadcrumbItems" />
    <div>
      <div class="relative mb-4 flex items-center gap-2">
        <input id="docName" v-model="docData.name" type="text" required
          class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        <button v-if="!isNewDocument" @click="removeDoc"
          class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Remove Document</button>
      </div>
      <div class="mt-5 h-[500px]">
        <div class="flex w-full">
          <div class="flex flex-col flex-grow">
            <EditorContent ref="editorContentRef" :content="docData?.content" :isSaving="isSaving"
              :savedSuccessfully="savedSuccessfully" :show-toc="showToc" @content-change="handleEditorContentChange"
              @toggle-comments="toggleComments" @toggle-toc="toggleToc" @highlight-comment="highlightComment" />
          </div>
          <CommentSidebar ref="commentSidebarRef" v-if="!isNewDocument && showComments" :doc-id="route.params.id"
            @comment-clicked="findAndHighlightCommentMark" @comment-deleted="removeCommentMark" />
          <TableOfContents v-if="!isNewDocument && showToc" ref="tocRef" :editor="editorContentRef?.editor"
            @scroll-to="scrollToPosition" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useDocument } from '../services/documents/useDocument';
import { useThread } from '../services/threads/useThread';
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import EditorContent from '../components/editor/EditorContent.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import { useProjectStore } from '../store/projectStore';
import CommentSidebar from '../components/comments/CommentSidebar.vue';
import TableOfContents from '../components/editor/TableOfContents.vue';

const htmlContent = ref('');
const editorContentRef = ref(null);
const docData = ref({ name: '', content: '' });
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
const showComments = ref(false);
const showToc = ref(true);
const tocRef = ref(null);

const toggleComments = (value) => {
  showComments.value = value !== undefined ? value : !showComments.value;
};

const toggleToc = () => {
  showToc.value = !showToc.value;
};

const breadcrumbItems = computed(() => {
  const items = [];

  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject._id}`
  });

  if (thread.value) {
    items.push({
      name: thread.value.name,
      path: `/thread/${thread.value._id}`
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
    docData.value = await loadDocument(id);
  }

  let threadId = route.query.threadId || docData.value?.thread;
  let projectId = projectStore.currentProject._id;

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
      thread: threadId,
      project: projectId
    };
  }

  htmlContent.value = docData.value.content;
});

const handleEditorContentChange = (content) => {
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
        if (isNewDocument.value) {
          await createDocument(docData.value);
        } else {
          await saveDocument(docData.value._id, { content: htmlContent.value });
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

const highlightComment = (commentId) => {
  if (commentSidebarRef.value) {
    commentSidebarRef.value.highlightComment(commentId);
  }
};

const findAndHighlightCommentMark = (commentId) => {
  if (!editorContentRef.value || !editorContentRef.value.editor) return;

  const editor = editorContentRef.value.editor;
  const doc = editor.state.doc;

  const findCommentMarkPosition = (doc) => {
    let result = null;

    doc.descendants((node, pos) => {
      if (result) return false;

      const marks = node.marks.filter(
        mark => mark.type.name === 'comment' && mark.attrs.commentId === commentId
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

    const commentMark = document.querySelector(`span[data-comment-id="${commentId}"]`);
    if (commentMark) {
      commentMark.style.backgroundColor = 'rgba(255, 215, 0, 0.6)';
      commentMark.style.transition = 'background-color 0.5s ease';

      setTimeout(() => {
        commentMark.style.backgroundColor = '';
      }, 2000);
    }
  }
};

const removeCommentMark = (commentId) => {
  if (!editorContentRef.value || !editorContentRef.value.editor) return;

  const editor = editorContentRef.value.editor;
  const doc = editor.state.doc;

  const findCommentMarkPosition = (doc) => {
    let result = null;

    doc.descendants((node, pos) => {
      if (result) return false;

      const marks = node.marks.filter(
        mark => mark.type.name === 'comment' && mark.attrs.commentId === commentId
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
  if (!docData.value._id) return;
  if (confirm('Are you sure you want to remove this document?')) {
    try {
      await removeDocument(docData.value._id);
      if (thread.value) {
        router.push(`/thread/${thread.value._id}`);
      } else {
        router.push(`/project/${projectStore.currentProject._id}`);
      }
    } catch (error) {
      console.error('Error removing document:', error);
      alert('Failed to remove document.');
    }
  }
};

const scrollToPosition = (position) => {
  if (editorContentRef.value && editorContentRef.value.scrollToPosition) {
    editorContentRef.value.scrollToPosition(position);
  }
};
</script>
