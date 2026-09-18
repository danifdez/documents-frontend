import { ref } from "vue";
import apiClient from "../api";
import type { FavoriteCategory } from "../../types/FavoriteCategory";

// Categorías de favoritos de un proyecto. Cada categoría puede colgar de otra
// (subcategoría) mediante `parentId`.
export function useFavoriteCategories() {
    const categories = ref<FavoriteCategory[]>([]);
    const isLoading = ref(false);

    const loadCategoriesByProject = async (projectId: string | number) => {
        isLoading.value = true;
        try {
            const response = await apiClient.get("/favorite-categories/project/" + projectId);
            categories.value = response.data;
            return response.data;
        } finally {
            isLoading.value = false;
        }
    };

    const createCategory = async (data: {
        projectId: number;
        name: string;
        parentId?: number | null;
    }) => {
        const response = await apiClient.post("/favorite-categories", data);
        return response.data;
    };

    const updateCategory = async (
        id: number,
        data: { name?: string; parentId?: number | null },
    ) => {
        const response = await apiClient.patch(`/favorite-categories/${id}`, data);
        return response.data;
    };

    const deleteCategory = async (id: number) => {
        const response = await apiClient.delete(`/favorite-categories/${id}`);
        return response.data;
    };

    return {
        categories,
        isLoading,
        loadCategoriesByProject,
        createCategory,
        updateCategory,
        deleteCategory,
    };
}
