import { ref } from "vue";
import apiClient from "../api";

export function useProjectList() {
    const projects = ref([]);
    const error = ref(null);
    const isLoading = ref(false);

    const loadProjects = async (includeArchived = false) => {
        isLoading.value = true;
        try {
            const url = includeArchived ? "/projects?includeArchived=true" : "/projects";
            const response = await apiClient.get(url);
            projects.value = response.data;
        } catch (err) {
            error.value = err;
        } finally {
            isLoading.value = false;
        }
    };

    const searchProjects = async (query: string, includeArchived = false) => {
        isLoading.value = true;
        try {
            if (!query || query.trim() === '') {
                return loadProjects(includeArchived);
            }

            const params = new URLSearchParams({ q: query });
            if (includeArchived) params.set('includeArchived', 'true');
            const response = await apiClient.get(`/projects/search?${params.toString()}`);
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