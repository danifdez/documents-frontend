import { ref } from "vue";
import apiClient from "../api";

export function useComment() {
    const error = ref(null);
    const isLoading = ref(false);

    const loadComment = async (id: string): Promise<object> => {
        isLoading.value = true;
        const response = await apiClient.get(`/comments/${id}`);

        isLoading.value = false;
        return response.data;
    };

    return {
        error,
        isLoading,
        loadComment,
    };
}