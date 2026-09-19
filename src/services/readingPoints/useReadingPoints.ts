import { ref } from 'vue';
import apiClient from '../api';

export type ReadingPointKind = 'reading' | 'section';

export interface ReadingPoint {
    id: number;
    kind: ReadingPointKind;
    label: string | null;
    fragmentId: string | null;
    exact: string | null;
    prefix: string | null;
    suffix: string | null;
    position: number;
    ratio: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ReadingPointAnchor {
    exact?: string;
    fragmentId?: string;
    prefix?: string;
    suffix?: string;
    position?: number;
    ratio?: number;
}

export const useReadingPoints = () => {
    const readingPoints = ref<ReadingPoint[]>([]);
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const loadReadingPoints = async (
        entityId: string,
        entityType: 'doc' | 'resource' = 'doc',
    ): Promise<ReadingPoint[]> => {
        if (!entityId) return [];

        isLoading.value = true;
        error.value = null;

        try {
            const endpoint = entityType === 'resource'
                ? `/reading-points/resource/${entityId}`
                : `/reading-points/doc/${entityId}`;
            const response = await apiClient.get(endpoint);
            readingPoints.value = response.data;
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        readingPoints,
        loadReadingPoints,
        isLoading,
        error,
    };
};
