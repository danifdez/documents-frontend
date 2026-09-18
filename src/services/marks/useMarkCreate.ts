import { ref } from 'vue';
import apiClient from '../api';

export interface AnnotationAnchor {
    quote?: string;
    prefix?: string;
    suffix?: string;
    position?: number;
}

export const useMarkCreate = () => {
    const isLoading = ref(false);
    const error = ref<Error | null>(null);

    const createMark = async (
        entityId: string,
        content: string,
        entityType: 'doc' | 'resource' = 'doc',
        type: string = 'highlight',
        anchor: AnnotationAnchor = {},
    ): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const payload: Record<string, any> = { content, type };
            if (anchor.prefix !== undefined) payload.prefix = anchor.prefix;
            if (anchor.suffix !== undefined) payload.suffix = anchor.suffix;
            if (anchor.position !== undefined) payload.position = anchor.position;
            payload[entityType] = Number(entityId);

            const response = await apiClient.post('/marks', payload);
            return response.data;
        } catch (e) {
            error.value = e as Error;
            throw e;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        createMark,
        isLoading,
        error
    };
};
