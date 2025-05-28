import { ref } from "vue";
import apiClient from "../api";

export function useCommentDelete() {
    const status = ref<boolean>(false);
    const error = ref<string | null>(null);
    const isLoading = ref<boolean>(false);

    const deleteComment = async (commentId: string) => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.delete(`/comments/${commentId}`);
            status.value = true;
            return response.data;
        } catch (err) {
            console.error('Error deleting comment:', err);
            error.value = err.response?.data?.message || 'Failed to delete comment';
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
        deleteComment,
    };
}
