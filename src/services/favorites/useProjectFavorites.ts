import { ref } from "vue";
import apiClient from "../api";
import type { Favorite } from "../../types/Favorite";

// Un favorito de proyecto: un puntero ligero a una página web, sin fichero ni
// indexado. Es lo que el navegador guarda desde su botón ☆ cuando está
// conectado a un proyecto. Puede pertenecer a una categoría (o subcategoría).
export function useProjectFavorites() {
    const favorites = ref<Favorite[]>([]);
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

    const addFavorite = async (
        projectId: string | number,
        url: string,
        title?: string,
        categoryId?: number | null,
    ) => {
        const response = await apiClient.post("/favorites", {
            projectId: Number(projectId),
            url,
            title,
            categoryId: categoryId ?? null,
        });
        return response.data;
    };

    const updateFavorite = async (
        id: number,
        data: { url?: string; title?: string; categoryId?: number | null },
    ) => {
        const response = await apiClient.patch(`/favorites/${id}`, data);
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
        updateFavorite,
        removeFavorite,
    };
}
