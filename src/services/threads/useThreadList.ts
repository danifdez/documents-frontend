import { ref } from "vue";
import apiClient from "../api";

export function useThreadList() {
    const threads = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadThreads = async (projectId: string, includeArchived = false) => {
        isLoading.value = true;
        const url = includeArchived
            ? `/threads/by-project/${projectId}?includeArchived=true`
            : `/threads/by-project/${projectId}`;
        const response = await apiClient.get(url);
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