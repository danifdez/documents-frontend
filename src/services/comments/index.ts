import { useCrudService } from '../useCrudService';
import apiClient from '../api';
import { ref } from 'vue';

const commentsCrud = useCrudService('/comments');

// ── Consolidated exports ──

export function useCommentList() {
  const comments = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const loadComments = async (entityId: string, entityType: 'doc' | 'resource' = 'doc') => {
    isLoading.value = true;
    error.value = null;
    try {
      const endpoint = entityType === 'doc'
        ? `/comments/doc/${entityId}`
        : `/comments/resource/${entityId}`;
      const response = await apiClient.get(endpoint);
      comments.value = response.data;
    } catch (err: any) {
      error.value = err?.response?.data?.message || err.message;
    } finally {
      isLoading.value = false;
    }
  };

  return { comments, isLoading, error, loadComments };
}

export function useComment() {
  const { load, item: comment, isLoading, error } = commentsCrud.useGet();
  return { loadComment: load, comment, isLoading, error };
}

export function useCommentCreate() {
  const { create, isLoading, error } = commentsCrud.useCreate();
  const createComment = async (resourceId: string, content: string) => {
    return create({ resource: resourceId, content } as any);
  };
  return { createComment, isLoading, error, status: ref(false) };
}

export function useCommentUpdate() {
  const { update, isLoading, error } = commentsCrud.useUpdate();
  const updateComment = async (commentId: string, content: string) => {
    return update(commentId, { content } as any);
  };
  return { updateComment, isLoading, error, status: ref(false) };
}

export function useCommentDelete() {
  const { remove, isLoading, error } = commentsCrud.useDelete();
  const deleteComment = async (commentId: string) => {
    return remove(commentId);
  };
  return { deleteComment, isLoading, error, status: ref(false) };
}
