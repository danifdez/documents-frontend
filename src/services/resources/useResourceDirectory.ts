import apiClient from "../api";

export function useResourceDirectory() {
    const fetchAllResources = async () => {
        const response = await apiClient.get("/resources");
        return response.data;
    };

    const fetchResource = async (id: string | number) => {
        const response = await apiClient.get(`/resources/${id}`);
        return response.data;
    };

    const fetchResourcesByProject = async (projectId: string | number) => {
        const response = await apiClient.get(`/resources/project/${projectId}`);
        return response.data;
    };

    const removeResource = async (id: string | number) => {
        await apiClient.delete(`/resources/${id}`);
    };

    return {
        fetchAllResources,
        fetchResource,
        fetchResourcesByProject,
        removeResource,
    };
}
