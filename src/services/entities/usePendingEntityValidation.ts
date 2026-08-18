import { ref } from 'vue';
import apiClient from '../api';
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
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const request = async <R>(failureMessage: string, run: () => Promise<R>): Promise<R> => {
        isLoading.value = true;
        error.value = null;

        try {
            return await run();
        } catch (err: any) {
            error.value = err.response?.data?.message || failureMessage;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const fetchEntity = (id: number): Promise<any> =>
        request('Failed to fetch entity', async () => (await apiClient.get(`/entities/${id}`)).data);

    const fetchPendingEntity = (id: number): Promise<PendingEntity> =>
        request('Failed to fetch pending entity', async () => (await apiClient.get(`/pending-entities/${id}`)).data);

    const findEntityByExactName = (name: string): Promise<any> =>
        request('Failed to search entity', async () =>
            (await apiClient.get('/entities/search/exact', { params: { name } })).data);

    const retranslatePendingEntity = (id: number, dto: RetranslatePendingEntityDto): Promise<any> =>
        request('Failed to retranslate pending entity', async () =>
            (await apiClient.post(`/pending-entities/${id}/retranslate`, dto)).data);

    const confirmPendingEntity = (id: number): Promise<any> =>
        request('Failed to confirm pending entity', async () =>
            (await apiClient.post(`/pending-entities/${id}/confirm`)).data);

    const mergePendingEntity = (id: number, dto: MergePendingEntityDto): Promise<any> =>
        request('Failed to merge pending entity', async () =>
            (await apiClient.post(`/pending-entities/${id}/merge`, dto)).data);

    const cancelMergePendingEntity = (id: number): Promise<any> =>
        request('Failed to cancel merge', async () =>
            (await apiClient.post(`/pending-entities/${id}/cancel-merge`)).data);

    const fetchConfirmedEntitiesByResource = (resourceId: number | string, term?: string): Promise<any> =>
        request('Failed to fetch confirmed entities', async () => {
            const url = `/entities/by-resource/${resourceId}${term ? `?term=${encodeURIComponent(term)}` : ''}`;
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
