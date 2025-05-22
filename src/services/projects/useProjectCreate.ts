import { ref } from "vue";
import apiClient from "../api";

export function useProjectCreate() {
    const status = ref(false);
    const error = ref(null);
    const isLoading = ref(false);

    const createProject = async (name: string, description?: string) => {
        isLoading.value = true;
        try {
            const projectData = {
                name,
                ...(description ? { description } : {})
            };

            const response = await apiClient.post("/projects", projectData);
            if (response.status !== 201) {
                error.value = "Failed to create project";
                return null;
            } else {
                status.value = true;
                return response.data;
            }
        } catch (err) {
            error.value = err;
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        status,
        error,
        isLoading,
        createProject,
    };
}