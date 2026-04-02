import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { getSocket } from '../notifications/notification';

export interface LookupResult {
    id: number | string;
    name: string;
    collection: string;
    score: number;
    highlightedName?: string;
    highlightedContent?: string;
    source: 'natural' | 'rag';
    metadata?: Record<string, any>;
}

// Map RAG source_type (singular) to the collection names used by natural search and routes
const sourceTypeToCollection: Record<string, string> = {
    resource: 'resources',
    doc: 'docs',
    knowledge: 'knowledge',
    note: 'notes',
    canvas: 'canvases',
    entity: 'entities',
    dataset: 'datasets',
    event: 'events',
};

export function useLookup() {
    const results = ref<LookupResult[]>([]);
    const isLoading = ref(false);

    const lookup = async (term: string, projectId?: number): Promise<void> => {
        isLoading.value = true;
        results.value = [];

        const requestId = uuidv4();

        const naturalSearch = apiClient.post('/search', {
            term,
            projectId,
        }).then(res => (res.data || []).map((r: any) => ({
            ...r,
            source: 'natural' as const,
        }))).catch(() => []);

        const ragSearch = new Promise<LookupResult[]>((resolve) => {
            const socket = getSocket();
            const timeout = setTimeout(() => {
                socket.off('searchResponse', onResponse);
                resolve([]);
            }, 15000);

            const onResponse = (data: any) => {
                if (data.requestId !== requestId) return;
                socket.off('searchResponse', onResponse);
                clearTimeout(timeout);
                const ragResults = (data.results || []).map((r: any, i: number) => {
                    const rawType = r.metadata?.source_type || 'unknown';
                    const collection = sourceTypeToCollection[rawType] || rawType;
                    const sourceId = r.metadata?.source_id;
                    const text = (r.text || '').trim();
                    // Use first line as name, rest as content preview
                    const firstLine = text.split('\n')[0]?.slice(0, 120) || `${rawType} #${sourceId || i}`;
                    return {
                        id: sourceId || `rag-${i}`,
                        name: firstLine,
                        collection,
                        score: r.score || 0,
                        highlightedContent: text.length > 120 ? text.slice(0, 300) : text,
                        source: 'rag' as const,
                        metadata: r.metadata,
                    };
                });
                resolve(ragResults);
            };
            socket.on('searchResponse', onResponse);

            apiClient.post('/model/semantic-search', {
                query: term,
                projectId,
                requestId,
                limit: 10,
            }).catch(() => {
                socket.off('searchResponse', onResponse);
                clearTimeout(timeout);
                resolve([]);
            });
        });

        try {
            const [naturalResults, ragResults] = await Promise.all([naturalSearch, ragSearch]);

            // Merge and deduplicate
            const merged: LookupResult[] = [];
            const seen = new Set<string>();

            // Add natural results first (higher trust for exact matches)
            for (const r of naturalResults) {
                const key = `${r.collection}-${r.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(r);
                }
            }

            // Add RAG results that aren't duplicates
            for (const r of ragResults) {
                const key = `${r.collection}-${r.id}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    merged.push(r);
                }
            }

            // Sort by score descending
            merged.sort((a, b) => b.score - a.score);
            results.value = merged;
        } finally {
            isLoading.value = false;
        }
    };

    return { results, isLoading, lookup };
}
