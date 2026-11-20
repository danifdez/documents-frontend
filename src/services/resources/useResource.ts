import type { Author } from '../author/useAuthor';
import type { ResourceListEntity } from './useResourceDetails';
import { getErrorMessage } from '../../utils/errorDetails';
import { ref } from "vue";
import apiClient from "../api";

export interface Resource {
    id?: number;
    name?: string;
    title?: string | null;
    project?: { id: number; name: string } | null;
    content?: string | null;
    translatedContent?: string | null;
    mimeType?: string | null;
    originalName?: string | null;
    summary?: string | null;
    keyPoints?: string[] | null;
    keywords?: string[] | null;
    language?: string | null;
    status?: string;
    publicationDate?: string | null;
    entities?: ResourceListEntity[];
    authors?: Author[];
    [key: string]: unknown;
}

export function useResource() {
    const error = ref<string | null>(null);
    const isLoading = ref(false);

    const loadResource = async (id: string): Promise<Resource> => {
        isLoading.value = true;
        error.value = null;

        try {
            // Fetch metadata and content in parallel
            const [metaRes, contentRes] = await Promise.all([
                apiClient.get<Resource>(`/resources/${id}`),
                apiClient.get<{ content?: string | null }>(`/resources/${id}/content`),
            ]);

            const resource: Resource = metaRes.data || {};
            // content endpoint returns { id, content }
            const contentPayload = contentRes?.data || {};
            resource.content = contentPayload.content ?? resource.content ?? null;

            return resource;
        } catch (err: unknown) {
            error.value = getErrorMessage(err) || 'Failed to load resource';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const updateResource = async (id: string | number, resourceData: unknown) => {
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
            error.value = getErrorMessage(err) || "Failed to delete resource";
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