import { ref } from "vue";
import apiClient from "../api";

export interface ResourceType {
    _id: string;
    abbreviation: string;
    name: string;
    description?: string;
    example?: string;
}

export function useResourceType() {
    const resourceTypes = ref<ResourceType[]>([]);
    const error = ref<string | null>(null);
    const isLoading = ref(false);

    const loadResourceTypes = async (): Promise<ResourceType[]> => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get("/resource-types");
            resourceTypes.value = response.data;
            return response.data;
        } catch (err) {
            error.value = "Failed to load resource types";
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const getResourceTypeName = (typeId: string): string => {
        const resourceType = resourceTypes.value.find(rt => rt._id === typeId);
        return resourceType ? resourceType.name : typeId;
    };

    const getResourceTypeAbbreviation = (typeId: string): string => {
        const resourceType = resourceTypes.value.find(rt => rt._id === typeId);
        return resourceType ? resourceType.abbreviation : typeId;
    };

    return {
        resourceTypes,
        error,
        isLoading,
        loadResourceTypes,
        getResourceTypeName,
        getResourceTypeAbbreviation,
    };
}
