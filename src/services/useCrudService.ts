import { ref } from 'vue';
import apiClient from './api';

export function useCrudService<T = any>(basePath: string) {

  function useList(subPath?: string) {
    const items = ref<T[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const load = async (path?: string) => {
      isLoading.value = true;
      error.value = null;
      try {
        const url = path || subPath || basePath;
        const response = await apiClient.get(url);
        items.value = response.data;
        return items.value;
      } catch (err: any) {
        error.value = err?.response?.data?.message || err.message || 'Failed to load';
        return [];
      } finally {
        isLoading.value = false;
      }
    };

    return { items, isLoading, error, load };
  }

  function useGet() {
    const item = ref<T | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const load = async (id: string | number) => {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.get(`${basePath}/${id}`);
        item.value = response.data;
        return item.value;
      } catch (err: any) {
        error.value = err?.response?.data?.message || err.message || 'Failed to load';
        return null;
      } finally {
        isLoading.value = false;
      }
    };

    return { item, isLoading, error, load };
  }

  function useCreate() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const create = async (data: Partial<T>) => {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.post(basePath, data);
        return response.data as T;
      } catch (err: any) {
        error.value = err?.response?.data?.message || err.message || 'Failed to create';
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    return { isLoading, error, create };
  }

  function useUpdate() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const update = async (id: string | number, data: Partial<T>) => {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.patch(`${basePath}/${id}`, data);
        return response.data as T;
      } catch (err: any) {
        error.value = err?.response?.data?.message || err.message || 'Failed to update';
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    return { isLoading, error, update };
  }

  function useDelete() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const remove = async (id: string | number) => {
      isLoading.value = true;
      error.value = null;
      try {
        const response = await apiClient.delete(`${basePath}/${id}`);
        return response.data;
      } catch (err: any) {
        error.value = err?.response?.data?.message || err.message || 'Failed to delete';
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    return { isLoading, error, remove };
  }

  return { useList, useGet, useCreate, useUpdate, useDelete };
}
