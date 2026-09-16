import { ref } from "vue";
import apiClient from "../api";

// Un favorito de proyecto: un puntero ligero a una página web, sin fichero ni
// indexado. Es lo que el navegador guarda desde su botón ☆ cuando está
// conectado a un proyecto.
export interface ProjectFavorite {
    id: number;
    url: string;
    title: string;
    createdAt?: string;
    updatedAt?: string;
}

export function useProjectFavorites() {
    const favorites = ref<ProjectFavorite[]>([]);
    const isLoading = ref(false);

    const loadFavoritesByProject = async (projectId: string | number) => {
        isLoading.value = true;
        try {
            const response = await apiClient.get("/favorites/project/" + projectId);
            favorites.value = response.data;
            return response.data;
        } finally {
            isLoading.value = false;
        }
    };

    const addFavorite = async (projectId: string | number, url: string, title?: string) => {
        const response = await apiClient.post("/favorites", {
            projectId: Number(projectId),
            url,
            title,
        });
        return response.data;
    };

    const renameFavorite = async (id: number, title: string) => {
        const response = await apiClient.patch(`/favorites/${id}`, { title });
        return response.data;
    };

    const removeFavorite = async (id: number) => {
        const response = await apiClient.delete(`/favorites/${id}`);
        return response.data;
    };

    return {
        favorites,
        isLoading,
        loadFavoritesByProject,
        addFavorite,
        renameFavorite,
        removeFavorite,
    };
}
