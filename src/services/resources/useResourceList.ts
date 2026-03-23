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

    const loadPendingResources = async () => {
        isLoading.value = true;
        try {
            const response = await apiClient.get("/resources/pending");
            return response.data;
        } finally {
            isLoading.value = false;
        }
    };

    const assignResourceToProject = async (resourceId: number | string, projectId: number | string) => {
        const response = await apiClient.patch(`/resources/${resourceId}/assign`, {
            projectId: Number(projectId),
        });
        return response.data;
    };

    return {
        resources,
        error,
        isLoading,
        loadResourcesByProject,
        loadPendingResources,
        assignResourceToProject,
    };
}