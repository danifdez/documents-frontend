import { ref } from "vue";
import apiClient from "../api";

export function useCommentUpdate() {
    const status = ref<boolean>(false);
    const error = ref<string | null>(null);
    const isLoading = ref<boolean>(false);

    const updateComment = async (commentId: string, content: string) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.patch(`/comments/${commentId}`, {
                content
            });

            status.value = true;
            return response.data;
        } catch (err) {
            console.error('Error updating comment:', err);
            error.value = err.response?.data?.message || 'Failed to update comment';
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
        updateComment,
    };
}
