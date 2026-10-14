import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

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
    description?: string | null;
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
    description?: string;
    entityTypeId?: number;
    aliases?: EntityAlias[];
    scope?: EntityScope;
    contextSelection?: ContextSelection;
}

export interface UpdatePendingEntityDto {
    name?: string;
    description?: string;
    entityTypeId?: number;
    aliases?: EntityAlias[];
    scope?: EntityScope;
    translations?: EntityTranslation;
}

export const usePendingEntities = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchPendingEntitiesByResourceId = (resourceId: string): Promise<PendingEntity[]> =>
        request('Failed to fetch pending entities', async () =>
            (await apiClient.get<PendingEntity[]>(`/pending-entities/resource/${resourceId}`)).data);

    const createPendingEntity = (dto: CreatePendingEntityDto): Promise<PendingEntity> =>
        request('Failed to create pending entity', async () =>
            (await apiClient.post<PendingEntity>('/pending-entities', dto)).data);

    const updatePendingEntity = (id: number, dto: UpdatePendingEntityDto): Promise<PendingEntity> =>
        request('Failed to update pending entity', async () =>
            (await apiClient.put<PendingEntity>(`/pending-entities/${id}`, dto)).data);

    const deletePendingEntity = (id: number): Promise<void> =>
        request('Failed to delete pending entity', async () => {
            await apiClient.delete(`/pending-entities/${id}`);
        });

    const confirmEntities = (resourceId: string): Promise<{ confirmed: number; errors: string[] }> =>
        request('Failed to confirm entities', async () =>
            (await apiClient.post<{ confirmed: number; errors: string[] }>(
                `/pending-entities/resource/${resourceId}/confirm`
            )).data);

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
