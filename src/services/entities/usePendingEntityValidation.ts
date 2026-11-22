import type { Entity } from './useEntities';
import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';
import type { EntityScope, PendingEntity } from './usePendingEntities';

// NOTE: complements usePendingEntities.ts (pending consolidation).

export interface RetranslatePendingEntityDto {
    newName: string;
    currentLanguage: string;
    resourceLanguage: string;
    targetLanguage: string;
}

export interface MergePendingEntityDto {
    targetType: 'pending' | 'confirmed';
    targetId: number;
    aliasScope: EntityScope;
}

export const usePendingEntityValidation = () => {
    const { isLoading, error, request } = useApiRequest();

    const fetchEntity = (id: number): Promise<Entity> =>
        request('Failed to fetch entity', async () => (await apiClient.get(`/entities/${id}`)).data);

    const fetchPendingEntity = (id: number): Promise<PendingEntity> =>
        request('Failed to fetch pending entity', async () => (await apiClient.get(`/pending-entities/${id}`)).data);

    const findEntityByExactName = (name: string): Promise<Entity | null> =>
        request('Failed to search entity', async () =>
            (await apiClient.get('/entities/search/exact', { params: { name } })).data);

    const retranslatePendingEntity = (id: number, dto: RetranslatePendingEntityDto): Promise<unknown> =>
        request('Failed to retranslate pending entity', async () =>
            (await apiClient.post(`/pending-entities/${id}/retranslate`, dto)).data);

    const confirmPendingEntity = (id: number): Promise<{ success: boolean; message?: string }> =>
        request('Failed to confirm pending entity', async () =>
            (await apiClient.post(`/pending-entities/${id}/confirm`)).data);

    const mergePendingEntity = (id: number, dto: MergePendingEntityDto): Promise<{ pending?: PendingEntity }> =>
        request('Failed to merge pending entity', async () =>
            (await apiClient.post(`/pending-entities/${id}/merge`, dto)).data);

    const cancelMergePendingEntity = (id: number): Promise<{ success: boolean; message: string }> =>
        request('Failed to cancel merge', async () =>
            (await apiClient.post(`/pending-entities/${id}/cancel-merge`)).data);

    const fetchConfirmedEntitiesByResource = (resourceId: number | string, term?: string): Promise<Record<EntityScope, Entity[]>> =>
        request('Failed to fetch confirmed entities', async () => {
            const query = term ? `?term=${encodeURIComponent(term)}` : '';
            const url = `/entities/by-resource/${resourceId}${query}`;
            return (await apiClient.get(url)).data;
        });

    return {
        isLoading,
        error,
        fetchEntity,
        fetchPendingEntity,
        findEntityByExactName,
        retranslatePendingEntity,
        confirmPendingEntity,
        mergePendingEntity,
        cancelMergePendingEntity,
        fetchConfirmedEntitiesByResource,
    };
};
