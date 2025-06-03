import { ref } from "vue";
import apiClient from "../api";

export function useDocumentProjectList() {
    const documents = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadDocumentsByProject = async (idProject: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get("/docs/project/" + idProject);
            documents.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            documents.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        documents,
        error,
        isLoading,
        loadDocumentsByProject,
    };
}
