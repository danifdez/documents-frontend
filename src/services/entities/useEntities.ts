import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

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

export interface EntityKnowledgeEntry {
    id: number;
    title: string;
    summary: string | null;
}

export interface EntityDetail extends Entity {
    resources?: EntityResource[];
    projects?: { id: number; name: string }[];
    knowledgeEntries?: EntityKnowledgeEntry[];
}

export const useEntities = () => {
    const { isLoading, error, request } = useApiRequest();

    const removeEntityFromResource = (resourceId: string, entityId: number): Promise<void> =>
        request('Failed to remove entity from resource', async () => {
            await apiClient.delete(`/resources/${resourceId}/entities/${entityId}`);
        });

    const mergeEntities = (sourceEntityId: number, targetEntityId: number): Promise<Entity> =>
        request('Failed to merge entities', async () =>
            (await apiClient.post(`/entities/${sourceEntityId}/merge/${targetEntityId}`)).data);

    const searchEntities = (searchTerm: string): Promise<Entity[]> =>
        request('Failed to search entities', async () => {
            if (!searchTerm || searchTerm.trim().length === 0) {
                return [];
            }
            return (await apiClient.get(`/entities/search?q=${encodeURIComponent(searchTerm.trim())}`)).data;
        });

    const getAllEntities = (): Promise<Entity[]> =>
        request('Failed to fetch entities', async () => (await apiClient.get('/entities')).data);

    const updateEntity = (entityId: number, data: { name?: string; description?: string; entityTypeId?: number }): Promise<Entity> =>
        request('Failed to update entity', async () => (await apiClient.patch(`/entities/${entityId}`, data)).data);

    const deleteEntity = (entityId: number): Promise<void> =>
        request('Failed to delete entity', async () => {
            await apiClient.delete(`/entities/${entityId}`);
        });

    const getEntityById = (entityId: number): Promise<EntityDetail> =>
        request('Failed to fetch entity', async () => (await apiClient.get(`/entities/${entityId}/detailed`)).data);

    const createEntity = (data: { name: string; entityTypeId: number; description?: string }): Promise<Entity> =>
        request('Failed to create entity', async () => (await apiClient.post('/entities', data)).data);

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
