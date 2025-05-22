import { ref } from "vue";
import apiClient from "../api";
import type { Project } from '../../types/Project';

export function useProject() {
    const error = ref(null);
    const isLoading = ref(false);

    const loadProject = async (id: string): Promise<object> => {
        if (!id) {
            error.value = 'Invalid project ID';
            return null;
        }

        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get(`/projects/${id}`);

            if (!response.data) {
                throw new Error('No data returned from API');
            }

            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to load project';
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    const updateProject = async (id: string, projectData: Partial<Project>) => {
        try {
            const response = await apiClient.patch(`/projects/${id}`, projectData);
            return response.data;
        } catch (error) {
            console.error("Error updating project:", error);
            throw error;
        }
    };

    const deleteProject = async (id: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/projects/${id}`);
            return true;
        } catch (err) {
            error.value = err.message || "Failed to delete project";
            console.error(error.value);
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        error,
        isLoading,
        loadProject,
        updateProject,
        deleteProject,
    };
}