import type { MarkType } from '../../components/editor/extensions/markTypes';
import { ref } from 'vue';
import apiClient from '../api';

export interface StoredMark {
    id: string;
    content: string;
    type?: MarkType;
}

export const useMarks = () => {
    const marks = ref<StoredMark[]>([]);
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const loadMarks = async (entityId: string, entityType: 'doc' | 'resource' = 'doc'): Promise<StoredMark[]> => {
        if (!entityId) return [];

        isLoading.value = true;
        error.value = null;

        try {
            const endpoint = entityType === 'resource'
                ? `/marks/resource/${entityId}`
                : `/marks/doc/${entityId}`;
            const response = await apiClient.get(endpoint);
            marks.value = response.data;
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        marks,
        loadMarks,
        isLoading,
        error
    };
};
