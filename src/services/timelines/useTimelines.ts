import { ref } from 'vue';
import apiClient from '../api';
import type { TimelineRecord } from '../../types/timeline';

export function useTimelines() {
  const timelines = ref<TimelineRecord[]>([]);
  const timeline = ref<TimelineRecord | null>(null);
  const error = ref(null);
  const isLoading = ref(false);

  const loadTimeline = async (id: string | number) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/timelines/${id}`);
      timeline.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      timeline.value = null;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const loadTimelinesByProject = async (projectId: string | number) => {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/timelines/project/${projectId}`);
      timelines.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      timelines.value = [];
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const createTimeline = async (data: Partial<TimelineRecord>) => {
    try {
      const response = await apiClient.post('/timelines', data);
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    }
  };

  const updateTimeline = async (id: string | number, data: Partial<TimelineRecord>) => {
    try {
      const response = await apiClient.patch(`/timelines/${id}`, data);
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    }
  };

  const deleteTimeline = async (id: string | number) => {
    try {
      const response = await apiClient.delete(`/timelines/${id}`);
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    }
  };

  return {
    timelines,
    timeline,
    error,
    isLoading,
    loadTimeline,
    loadTimelinesByProject,
    createTimeline,
    updateTimeline,
    deleteTimeline,
  };
}
