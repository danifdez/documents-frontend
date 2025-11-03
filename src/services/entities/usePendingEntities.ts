import { ref } from 'vue';
import apiClient from '../api';

export type EntityScope = 'document' | 'project' | 'global';

export interface EntityAlias {
    locale: string;
    value: string;
    scope: EntityScope;
}

export interface EntityTranslation {
    [locale: string]: string;
}

export interface ContextSelection {
    text: string;
    startOffset?: number;
    endOffset?: number;
    source?: 'content' | 'translation';
}

export interface PendingEntity {
    id: number;
    resourceId: number;
    name: string;
    aliases: EntityAlias[] | null;
    translations: EntityTranslation | null;
    language?: string | null;
    scope: EntityScope;
    contextSelection: ContextSelection | null;
    entityType: {
        id: number;
        name: string;
        description?: string;
    } | null;
    createdAt: string;
    updatedAt: string;
    isConfirmed?: boolean; // Flag to indicate if entity already exists as confirmed
    // Merge state
    status?: 'pending' | 'merged';
    mergedTargetType?: 'pending' | 'confirmed' | null;
    mergedTargetId?: number | null;
    mergedAt?: string | null;
    // Frontend helper: resolved name of the merge target
    mergedTargetName?: string | null;
}

export interface CreatePendingEntityDto {
    resourceId: number;
    name: string;
    entityTypeId?: number;
    aliases?: EntityAlias[];
    scope?: EntityScope;
    contextSelection?: ContextSelection;
}

export interface UpdatePendingEntityDto {
    name?: string;
    entityTypeId?: number;
    aliases?: EntityAlias[];
    scope?: EntityScope;
    translations?: EntityTranslation;
}

export const usePendingEntities = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchPendingEntitiesByResourceId = async (resourceId: string): Promise<PendingEntity[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get<PendingEntity[]>(`/pending-entities/resource/${resourceId}`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to fetch pending entities';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createPendingEntity = async (dto: CreatePendingEntityDto): Promise<PendingEntity> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post<PendingEntity>('/pending-entities', dto);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to create pending entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updatePendingEntity = async (id: number, dto: UpdatePendingEntityDto): Promise<PendingEntity> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.put<PendingEntity>(`/pending-entities/${id}`, dto);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to update pending entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const deletePendingEntity = async (id: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        try {
            await apiClient.delete(`/pending-entities/${id}`);
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to delete pending entity';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const confirmEntities = async (resourceId: string): Promise<{ confirmed: number; errors: string[] }> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post<{ confirmed: number; errors: string[] }>(
                `/pending-entities/resource/${resourceId}/confirm`
            );
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to confirm entities';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        fetchPendingEntitiesByResourceId,
        createPendingEntity,
        updatePendingEntity,
        deletePendingEntity,
        confirmEntities,
    };
};
