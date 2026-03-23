<template>
  <div class="comment-sidebar bg-surface-elevated rounded-xl border border-border h-full flex flex-col">
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <LoadingSpinner size="sm" />
    </div>

    <div v-else-if="error" class="flex items-center justify-center py-8 px-4">
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-red-400 mx-auto mb-2" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-500 font-medium">Error loading comments</p>
      </div>
    </div>

    <div v-else-if="comments.length === 0" class="flex items-center justify-center py-10 px-4">
      <div class="text-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-text-muted mx-auto mb-2" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-sm text-text-muted">No comments yet</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <div v-for="comment in sortedComments" :key="comment.id" :id="`comment-${comment.id}`"
        class="group border-b border-border-light last:border-b-0 px-4 py-3 transition-colors hover:bg-surface-hover cursor-pointer"
        :class="{ 'bg-amber-50': highlightedCommentId === comment.id }"
        @click="handleCommentClick(comment.id)">
        <div class="flex justify-between items-start gap-2 mb-1.5">
          <div class="flex-1 text-text-primary text-sm leading-relaxed whitespace-pre-wrap break-words">
            {{ comment.content }}
          </div>
          <div class="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click.stop="editComment(comment)"
              class="p-1 text-text-muted hover:text-accent rounded transition-colors cursor-pointer"
              title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button @click.stop="deleteComment(comment)"
              class="p-1 text-text-muted hover:text-red-500 rounded transition-colors cursor-pointer"
              title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-text-muted">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ formatDate(comment.createdAt) }}</span>
        </div>
      </div>
    </div>

    <CommentEditModal v-model:show="showEditModal" :comment="currentEditComment" @save="handleEditSave"
      @cancel="handleEditCancel" />

    <!-- Confirm Modal -->
    <ConfirmModal :is-open="showDeleteCommentModal" title="Delete Comment"
      :message="`Are you sure you want to delete this comment: &quot;${commentToDelete?.content.substring(0, 30)}${commentToDelete?.content.length > 30 ? '...' : ''}&quot;?`"
      confirm-text="Delete" cancel-text="Cancel" confirm-variant="danger" @confirm="handleDeleteCommentConfirm"
      @cancel="handleDeleteCommentCancel" />
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref } from 'vue';
import LoadingSpinner from '../ui/LoadingSpinner.vue';
import { useCommentList } from '../../services/comments/useCommentList';
import { useCommentUpdate } from '../../services/comments/useCommentUpdate';
import { useCommentDelete } from '../../services/comments/useCommentDelete';
import CommentEditModal from './CommentEditModal.vue';
import ConfirmModal from '../ui/ConfirmModal.vue';

const props = defineProps({
  docId: {
    type: String,
    required: false
  },
  resourceId: {
    type: String,
    required: false
  },
});

const emit = defineEmits(['comment-added', 'comment-clicked', 'comment-updated', 'comment-deleted']);

const { comments, error, isLoading, loadComments } = useCommentList();
const { updateComment, } = useCommentUpdate();
const { deleteComment: deleteCommentAPI } = useCommentDelete();

// Determine which ID to use
const entityId = computed(() => props.docId || props.resourceId);
const entityType = computed(() => props.docId ? 'doc' : 'resource');

// Confirm Modal state
const showDeleteCommentModal = ref(false);
const commentToDelete = ref(null);

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
  commentToDelete.value = comment;
  showDeleteCommentModal.value = true;
};

const handleDeleteCommentConfirm = async () => {
  const comment = commentToDelete.value;
  showDeleteCommentModal.value = false;

  if (!comment) return;

  try {
    await deleteCommentAPI(comment.id);
    const index = comments.value.findIndex(c => c.id === comment.id);
    if (index !== -1) {
      comments.value.splice(index, 1);
    }

    emit('comment-deleted', comment.id);
  } catch (error) {
    console.error('Error deleting comment:', error);
  } finally {
    commentToDelete.value = null;
  }
};

const handleDeleteCommentCancel = () => {
  showDeleteCommentModal.value = false;
  commentToDelete.value = null;
};

defineExpose({
  highlightComment
});

onMounted(() => {
  if (entityId.value) {
    loadComments(entityId.value, entityType.value);
  }
});

watch(() => [props.docId, props.resourceId], () => {
  if (entityId.value) {
    loadComments(entityId.value, entityType.value);
  }
});
</script>
