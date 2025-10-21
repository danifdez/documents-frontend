<template>
  <div class="comment-sidebar bg-gray-50 border-l border-gray-300 w-80 p-4 overflow-y-auto">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-lg font-medium">Comments</h3>
    </div>

    <div v-if="isLoading" class="text-center py-4">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600">
      </div>
    </div>

    <div v-else-if="error" class="text-red-500 p-2">
      Error loading comments
    </div>

    <div v-else-if="comments.length === 0" class="text-gray-500 text-center py-4">
      No comments yet
    </div>

    <div v-else class="space-y-4">
      <div v-for="comment in sortedComments" :key="comment.id" :id="`comment-${comment.id}`"
        class="p-3 bg-white rounded-md shadow-sm transition-all duration-200 hover:bg-gray-50"
        :class="{ 'bg-yellow-50 border border-yellow-400': highlightedCommentId === comment.id }">
        <div class="flex justify-between items-start">
          <div class="text-gray-700 text-sm whitespace-pre-wrap cursor-pointer flex-grow"
            @click="handleCommentClick(comment.id)">{{ comment.content }}</div>
          <div class="flex items-center">
            <Button @click.stop="editComment(comment)">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Button>
            <Button @click.stop="deleteComment(comment)" title="Delete comment">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>
        <div class="mt-1 text-xs text-gray-500">
          {{ formatDate(comment.createdAt) }}
        </div>
      </div>
    </div>

    <CommentEditModal v-model:show="showEditModal" :comment="currentEditComment" @save="handleEditSave"
      @cancel="handleEditCancel" />
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import { useCommentList } from '../../services/comments/useCommentList';
import { useCommentUpdate } from '../../services/comments/useCommentUpdate';
import { useCommentDelete } from '../../services/comments/useCommentDelete';
import CommentEditModal from './CommentEditModal.vue';
import Button from '../ui/Button.vue';

const props = defineProps({
  docId: {
    type: String,
    required: true
  },
});

const emit = defineEmits(['comment-added', 'comment-clicked', 'comment-updated', 'comment-deleted']);

const { comments, error, isLoading, loadComments } = useCommentList();
const { updateComment, } = useCommentUpdate();
const { deleteComment: deleteCommentAPI } = useCommentDelete();

const sortedComments = computed(() => {
  return [...comments.value].sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  );
});

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

const highlightedCommentId = ref(null);

const highlightComment = (commentId) => {
  highlightedCommentId.value = commentId;

  setTimeout(() => {
    const commentEl = document.getElementById(`comment-${commentId}`);
    if (commentEl) {
      commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => {
      highlightedCommentId.value = null;
    }, 3000);
  }, 100);
};

const handleCommentClick = (commentId) => {
  highlightComment(commentId);
  emit('comment-clicked', commentId);
};

const showEditModal = ref(false);
const currentEditComment = ref(null);

const editComment = (comment) => {
  currentEditComment.value = comment;
  showEditModal.value = true;
};

const handleEditSave = async (newContent) => {
  if (currentEditComment.value && newContent.trim() !== currentEditComment.value.content) {
    try {
      const updatedComment = await updateComment(currentEditComment.value.id, newContent);
      const index = comments.value.findIndex(c => c.id === currentEditComment.value.id);
      if (index !== -1) {
        comments.value[index].content = newContent;
      }

      emit('comment-updated', updatedComment);
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  }

  showEditModal.value = false;
  currentEditComment.value = null;
};

const handleEditCancel = () => {
  showEditModal.value = false;
  currentEditComment.value = null;
};

const deleteComment = async (comment) => {
  if (confirm(`Are you sure you want to delete this comment: "${comment.content.substring(0, 30)}${comment.content.length > 30 ? '...' : ''}"?`)) {
    try {
      await deleteCommentAPI(comment.id);
      const index = comments.value.findIndex(c => c.id === comment.id);
      if (index !== -1) {
        comments.value.splice(index, 1);
      }

      emit('comment-deleted', comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }
};

defineExpose({
  highlightComment
});

onMounted(() => {
  if (props.docId) {
    loadComments(props.docId);
  }
});

watch(() => props.docId, (newId) => {
  if (newId) {
    loadComments(newId);
  }
});
</script>
