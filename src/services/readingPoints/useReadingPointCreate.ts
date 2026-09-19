import { ref } from 'vue';
import apiClient from '../api';
import type { ReadingPointKind, ReadingPointAnchor } from './useReadingPoints';

export const useReadingPointCreate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const createReadingPoint = async (
        entityId: string,
        kind: ReadingPointKind,
        label: string,
        entityType: 'doc' | 'resource' = 'doc',
        anchor: ReadingPointAnchor = {},
    ): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const payload: Record<string, any> = { kind, label };
            if (anchor.exact !== undefined) payload.exact = anchor.exact;
            if (anchor.fragmentId !== undefined) payload.fragmentId = anchor.fragmentId;
            if (anchor.prefix !== undefined) payload.prefix = anchor.prefix;
            if (anchor.suffix !== undefined) payload.suffix = anchor.suffix;
            if (anchor.position !== undefined) payload.position = anchor.position;
            if (anchor.ratio !== undefined) payload.ratio = anchor.ratio;
            payload[entityType] = Number(entityId);

            const response = await apiClient.post('/reading-points', payload);
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        createReadingPoint,
        isLoading,
        error,
    };
};
