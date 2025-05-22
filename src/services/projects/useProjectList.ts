import { ref } from "vue";
import apiClient from "../api";

export function useProjectList() {
    const projects = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadProjects = async () => {
        isLoading.value = true;
        try {
            const response = await apiClient.get("/projects");
            projects.value = response.data;
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    };

    const searchProjects = async (query: string) => {
        isLoading.value = true;
        try {
            if (!query || query.trim() === '') {
                return loadProjects();
            }

            const response = await apiClient.get(`/projects/search?q=${encodeURIComponent(query)}`);
            projects.value = response.data;
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        projects,
        error,
        isLoading,
        loadProjects,
        searchProjects,
    };
}