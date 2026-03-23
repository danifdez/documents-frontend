import { ref } from 'vue';
import apiClient from '../api';
import type { UserTask } from '../../types/UserTask';

export function useUserTasks() {
    const tasks = ref<UserTask[]>([]);
    const task = ref<UserTask | null>(null);
    const error = ref(null);
    const isLoading = ref(false);

    const loadTasks = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/user-tasks');
            tasks.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            tasks.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadTasksByProject = async (projectId: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/user-tasks/project/${projectId}`);
            tasks.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            tasks.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadTask = async (id: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/user-tasks/${id}`);
            task.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            task.value = null;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createTask = async (data: Partial<UserTask>) => {
        try {
            const response = await apiClient.post('/user-tasks', data);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const updateTask = async (id: string | number, data: Partial<UserTask>) => {
        try {
            const response = await apiClient.patch(`/user-tasks/${id}`, data);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const deleteTask = async (id: string | number) => {
        try {
            const response = await apiClient.delete(`/user-tasks/${id}`);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    return {
        tasks,
        task,
        error,
        isLoading,
        loadTasks,
        loadTasksByProject,
        loadTask,
        createTask,
        updateTask,
        deleteTask,
    };
}
