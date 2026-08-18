import apiClient from "../api";

export function useResourceDirectory() {
    const fetchAllResources = async () => {
        const response = await apiClient.get("/resources");
        return response.data;
    };

    return {
        fetchAllResources,
    };
}
