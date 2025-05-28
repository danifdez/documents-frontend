import { ref } from "vue";
import apiClient from "../api";

export function useCommentCreate() {
    const status = ref<boolean>(false);
    const error = ref<string | null>(null);
    const isLoading = ref<boolean>(false);

    const createComment = async (docId: string, content: string) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.post('/comments', {
                doc: docId,
                content
            });

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