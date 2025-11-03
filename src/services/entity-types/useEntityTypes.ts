import { ref } from 'vue';
import apiClient from '../api';

export interface EntityType {
    id: number;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const useEntityTypes = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchEntityTypes = async (): Promise<EntityType[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get<EntityType[]>('/entity-types');
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch entity types';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        fetchEntityTypes,
    };
};
