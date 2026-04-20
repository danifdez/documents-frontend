import { ref } from 'vue';
import apiClient from '../api';
import type { ResourceDate } from '../../types/ResourceDate';

export function useResourceDates() {
    const dates = ref<ResourceDate[]>([]);
    const loading = ref(false);
    const error = ref<string | null>(null);

    async function fetchDates(resourceId: number): Promise<void> {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await apiClient.get<ResourceDate[]>(`/resources/${resourceId}/dates`);
            dates.value = data || [];
        } catch (e: any) {
            error.value = e?.message || 'Failed to load dates';
            dates.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function removeDate(resourceId: number, id: number): Promise<void> {
        await apiClient.delete(`/resources/${resourceId}/dates/${id}`);
        dates.value = dates.value.filter((d) => d.id !== id);
    }

    return { dates, loading, error, fetchDates, removeDate };
}
