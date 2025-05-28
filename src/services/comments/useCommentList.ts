import { ref } from "vue";
import apiClient from "../api";

export function useCommentList() {
    const comments = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadComments = async (docId: string) => {
        isLoading.value = true;
        try {
            const response = await apiClient.get(`/comments/doc/${docId}`);
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