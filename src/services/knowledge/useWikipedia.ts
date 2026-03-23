import { ref } from 'vue';
import axios from 'axios';

export interface WikipediaResult {
    title: string;
    extract: string;
    thumbnail: string | null;
    url: string;
    lang: string;
}

export function useWikipedia() {
    const result = ref<WikipediaResult | null>(null);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const search = async (term: string, lang = 'es'): Promise<WikipediaResult | null> => {
        if (!term.trim()) return null;
        isLoading.value = true;
        error.value = null;
        result.value = null;
        try {
            const encoded = encodeURIComponent(term.trim());
            const response = await axios.get(
                `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
                { timeout: 8000 }
            );
            const data = response.data;
            result.value = {
                title: data.title,
                extract: data.extract,
                thumbnail: data.thumbnail?.source ?? null,
                url: data.content_urls?.desktop?.page ?? `https://${lang}.wikipedia.org/wiki/${encoded}`,
                lang,
            };
            return result.value;
        } catch (err: any) {
            if (err?.response?.status === 404) {
                error.value = 'No se encontró el artículo en Wikipedia';
            } else {
                error.value = 'Error al consultar Wikipedia';
            }
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    return { result, isLoading, error, search };
}
