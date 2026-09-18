import { ref } from "vue";
import apiClient from "../api";
import type { AnnotationAnchor } from "../marks/useMarkCreate";

export function useCommentCreate() {
    const status = ref<boolean>(false);
    const error = ref<string | null>(null);
    const isLoading = ref<boolean>(false);

    const createComment = async (
        entityId: string,
        content: string,
        entityType: 'doc' | 'resource' = 'doc',
        anchor: AnnotationAnchor = {},
    ) => {
        isLoading.value = true;
        error.value = null;

        try {
            const payload: Record<string, any> = { content };
            if (anchor.quote !== undefined) payload.quote = anchor.quote;
            if (anchor.prefix !== undefined) payload.prefix = anchor.prefix;
            if (anchor.suffix !== undefined) payload.suffix = anchor.suffix;
            if (anchor.position !== undefined) payload.position = anchor.position;
            payload[entityType] = Number(entityId);

            const response = await apiClient.post('/comments', payload);

            status.value = true;
            return response.data;
        } catch (err) {
            console.error('Error creating comment:', err);
            error.value = err.response?.data?.message || 'Failed to create comment';
            status.value = false;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        status,
        error,
        isLoading,
        createComment,
    };
}
