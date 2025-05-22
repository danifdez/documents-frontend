import { ref } from "vue";
import apiClient from "../api";

export function useResourceList() {
    const resources = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadResourcesByProject = async (idProject: string) => {
        isLoading.value = true;
        const response = await apiClient.get("/resources/project/" + idProject);
        isLoading.value = false;
        return response.data;
    };

    return {
        resources,
        error,
        isLoading,
        loadResourcesByProject,
    };
}