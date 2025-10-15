import { ref } from "vue";
import apiClient from "../api";

export interface Author {
    id: number;
    name: string;
    createdAt?: string;
    updatedAt?: string;
}

export function useAuthor() {
    const error = ref<string | null>(null);
    const isLoading = ref(false);
    const authors = ref<Author[]>([]);

    /**
     * Find or create an author by name
     */
    const findOrCreateAuthor = async (name: string): Promise<Author> => {
        try {
            const searchResponse = await apiClient.get(`/authors?name=${encodeURIComponent(name)}`);

            if (searchResponse.data && searchResponse.data.length > 0) {
                return searchResponse.data[0];
            }

            const createResponse = await apiClient.post('/authors', { name });
            return createResponse.data;
        } catch (err) {
            error.value = "Failed to find or create author";
            throw err;
        }
    };

    /**
     * Add an author to a resource
     */
    const addAuthorToResource = async (resourceId: number, authorId: number): Promise<void> => {
        try {
            await apiClient.post(`/resources/${resourceId}/authors/${authorId}`);
        } catch (err) {
            error.value = "Failed to add author to resource";
            throw err;
        }
    };

    /**
     * Remove an author from a resource
     */
    const removeAuthorFromResource = async (resourceId: number, authorId: number): Promise<void> => {
        try {
            await apiClient.delete(`/resources/${resourceId}/authors/${authorId}`);
        } catch (err) {
            error.value = "Failed to remove author from resource";
            throw err;
        }
    };

    /**
     * Update all authors for a resource (replaces existing authors)
     */
    const updateResourceAuthors = async (resourceId: number, authorNames: string[]): Promise<Author[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            await apiClient.delete(`/resources/${resourceId}/authors`);

            const createdAuthors: Author[] = [];
            for (const authorName of authorNames) {
                if (authorName.trim()) {
                    const author = await findOrCreateAuthor(authorName.trim());
                    await addAuthorToResource(resourceId, author.id);
                    createdAuthors.push(author);
                }
            }

            return createdAuthors;
        } catch (err) {
            error.value = "Failed to update resource authors";
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    /**
     * Get all authors
     */
    const loadAuthors = async (): Promise<Author[]> => {
        isLoading.value = true;
        error.value = null;

        try {
            const response = await apiClient.get('/authors');
            authors.value = response.data;
            return response.data;
        } catch (err) {
            error.value = "Failed to load authors";
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        authors,
        error,
        isLoading,
        findOrCreateAuthor,
        addAuthorToResource,
        removeAuthorFromResource,
        updateResourceAuthors,
        loadAuthors,
    };
}
