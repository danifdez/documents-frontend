import { ref } from 'vue';
import apiClient from '../api';

export interface EntityTranslation {
    [locale: string]: string;
}

export interface EntityAlias {
    locale: string;
    value: string;
}

export interface Entity {
    id: number;
    name: string;
    description?: string | null;
    translations?: EntityTranslation | null;
    aliases?: EntityAlias[] | null;
    entityType: {
        id: number;
        name: string;
        description?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface EntityResource {
    id: number;
    name: string;
    type?: string | null;
    status?: string;
    project?: {
        id: number;
        name: string;
    } | null;
}

export interface EntityDetail extends Entity {
    resources?: EntityResource[];
    projects?: { id: number; name: string }[];
}

export interface EntityMergeTarget {
    id: number;
    name: string;
    entityType: {
        id: number;
        name: string;
    };
}

export const useEntities = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const removeEntityFromResource = async (resourceId: string, entityId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        try {
            await apiClient.delete(`/resources/${resourceId}/entities/${entityId}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to remove entity from resource';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const mergeEntities = async (sourceEntityId: number, targetEntityId: number): Promise<Entity> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post(`/entities/${sourceEntityId}/merge/${targetEntityId}`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to merge entities';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const searchEntities = async (searchTerm: string): Promise<Entity[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            if (!searchTerm || searchTerm.trim().length === 0) {
                return [];
            }
            const response = await apiClient.get(`/entities/search?q=${encodeURIComponent(searchTerm.trim())}`);

            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to search entities';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getAllEntities = async (): Promise<Entity[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get('/entities');
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch entities';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateEntity = async (entityId: number, data: { name?: string; description?: string; entityTypeId?: number }): Promise<Entity> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.patch(`/entities/${entityId}`, data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to update entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const deleteEntity = async (entityId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        try {
            await apiClient.delete(`/entities/${entityId}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getEntityById = async (entityId: number): Promise<EntityDetail> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get(`/entities/${entityId}/detailed`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createEntity = async (data: { name: string; entityTypeId: number; description?: string }): Promise<Entity> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post('/entities', data);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        removeEntityFromResource,
        mergeEntities,
        searchEntities,
        getAllEntities,
        updateEntity,
        deleteEntity,
        createEntity,
        getEntityById,
    };
};