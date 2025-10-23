import { ref } from "vue";
import apiClient from "../api";

export function useResource() {
    const error = ref<string | null>(null);
    const isLoading = ref(false);

    const loadResource = async (id: string): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            // Fetch metadata and content in parallel
            const [metaRes, contentRes] = await Promise.all([
                apiClient.get(`/resources/${id}`),
                apiClient.get(`/resources/${id}/content`),
            ]);

            const resource = metaRes.data || {};
            // content endpoint returns { id, content }
            const contentPayload = contentRes?.data || {};
            resource.content = contentPayload.content ?? resource.content ?? null;

            return resource;
        } catch (err: any) {
            error.value = err?.message || 'Failed to load resource';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateResource = async (id: string, resourceData: any) => {
        try {
            const response = await apiClient.patch(`/resources/${id}`, resourceData);
            return response.data;
        } catch (error) {
            console.error("Error updating resource:", error);
            throw error;
        }
    };

    const deleteResource = async (id: string) => {
        isLoading.value = true;
        error.value = null;
        try {
            await apiClient.delete(`/resources/${id}`);
            return true;
        } catch (err) {
            error.value = err.message || "Failed to delete resource";
            return false;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        error,
        isLoading,
        loadResource,
        updateResource,
        deleteResource,
    };
}