import { ref } from "vue";
import apiClient from "../api";

export function useDocumentList() {
    const documents = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadDocuments = async (threadId: string) => {
        isLoading.value = true;
        try {
            const response = await apiClient.get(`/docs/thread/${threadId}`);
            documents.value = response.data;
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        documents,
        error,
        isLoading,
        loadDocuments,
    };
}