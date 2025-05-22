import { ref } from "vue";
import apiClient from "../api";

export function useThreadList() {
    const threads = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadThreads = async (projectId: string) => {
        isLoading.value = true;
        const response = await apiClient.get(`/threads/by-project/${projectId}`);
        threads.value = response.data;
        isLoading.value = false;
    };

    return {
        threads,
        error,
        isLoading,
        loadThreads,
    };
}