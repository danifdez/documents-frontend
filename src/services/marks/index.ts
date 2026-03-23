import { useCrudService } from '../useCrudService';
import apiClient from '../api';
import { ref } from 'vue';

const marksCrud = useCrudService('/marks');

// ── Consolidated exports ──

export function useMarks() {
  const marks = ref<any[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const loadMarks = async (entityId: string, entityType: 'doc' | 'resource' = 'doc') => {
    isLoading.value = true;
    error.value = null;
    try {
      const endpoint = entityType === 'doc'
        ? `/marks/doc/${entityId}`
        : `/marks/resource/${entityId}`;
      const response = await apiClient.get(endpoint);
      marks.value = response.data;
    } catch (err: any) {
      error.value = err?.response?.data?.message || err.message;
    } finally {
      isLoading.value = false;
    }
  };

  return { marks, isLoading, error, loadMarks };
}

export function useMarkCreate() {
  const { create, isLoading, error } = marksCrud.useCreate();
  const createMark = async (data: Record<string, any>) => {
    return create(data as any);
  };
  return { createMark, isLoading, error, status: ref(false) };
}

export function useMarkUpdate() {
  const { update, isLoading, error } = marksCrud.useUpdate();
  const updateMark = async (markId: string, data: Record<string, any>) => {
    return update(markId, data as any);
  };
  return { updateMark, isLoading, error, status: ref(false) };
}

export function useMarkDelete() {
  const { remove, isLoading, error } = marksCrud.useDelete();
  const deleteMark = async (markId: string) => {
    return remove(markId);
  };
  return { deleteMark, isLoading, error, status: ref(false) };
}
