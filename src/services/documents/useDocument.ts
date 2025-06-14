import { ref } from "vue";
import apiClient from "../api";

export function useDocument() {
    const error = ref(null);
    const isLoading = ref(false);

    const loadDocument = async (id: string): Promise<object> => {
        isLoading.value = true;
        const response = await apiClient.get(`/docs/${id}`);

        isLoading.value = false;
        return response.data;
    };

    const saveDocument = async (id: string, docData: object) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.patch(`/docs/${id}`, docData);
            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to save document';
            console.error(error.value);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createDocument = async (docData: object) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.post(`/docs`, docData);
            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to create document';
            console.error(error.value);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const removeDocument = async (id: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.delete(`/docs/${id}`);
            return response.data;
        } catch (err) {
            error.value = err.message || 'Failed to remove document';
            console.error(error.value);
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        error,
        isLoading,
        loadDocument,
        saveDocument,
        createDocument,
        removeDocument,
    };
}