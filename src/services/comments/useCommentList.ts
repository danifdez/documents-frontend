import { ref } from "vue";
import apiClient from "../api";

export function useCommentList() {
    const comments = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadComments = async (entityId: string, entityType: 'doc' | 'resource' = 'doc') => {
        isLoading.value = true;
        try {
            const endpoint = entityType === 'doc'
                ? `/comments/doc/${entityId}`
                : `/comments/resource/${entityId}`;
            const response = await apiClient.get(endpoint);
            comments.value = response.data;
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        comments,
        error,
        isLoading,
        loadComments,
    };
}