import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '../services/api';
import type { Project } from '../types/Project';

export const useProjectStore = defineStore('project', () => {
    const currentProject = ref<Project | null>(null);
    const error = ref<string | null>(null);
    const loading = ref<boolean>(false);

    const setCurrentProject = (project: Project | null) => {
        if (project) {
            if (!project._id) {
                console.error('Attempted to store a project without _id:', project);
                return;
            }

            if (!project.name) {
                console.error('Attempted to store a project without name:', project);
                project.name = 'Unnamed Project';
            }
        }

        currentProject.value = project;
    };

    const loadProject = async (id: string): Promise<void> => {
        if (!id) {
            error.value = 'Invalid project ID';
            return;
        }

        if (currentProject.value && currentProject.value._id === id) {
            return;
        }

        loading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get(`/projects/${id}`);

            if (!response.data) {
                throw new Error('No project data received from API');
            }

            if (!response.data._id || !response.data.name) {
                throw new Error('Invalid project data received');
            }

            currentProject.value = response.data;

        } catch (err: any) {
            error.value = err.message || 'Failed to load project';
            currentProject.value = null;
        } finally {
            loading.value = false;
        }
    };

    const clearCurrentProject = () => {
        currentProject.value = null;
    };

    return {
        currentProject,
        error,
        loading,

        setCurrentProject,
        loadProject,
        clearCurrentProject
    };
});