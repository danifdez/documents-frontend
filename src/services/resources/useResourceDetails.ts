import type { Entity } from '../entities/useEntities';
import apiClient from '../api';

export type ResourceListEntity = Pick<Entity, 'id' | 'name' | 'description' | 'translations' | 'aliases'> & {
    entityType?: Entity['entityType'] | null;
    type?: string | null;
};

type ResourceEntityRow = ResourceListEntity & {
    entity_id?: number;
    entity_name?: string;
    entity_description?: string | null;
    entity_type?: string | null;
};

export function useResourceDetails() {
    const fetchTranslatedContent = async (id: string): Promise<{ translatedContent?: string | null }> => {
        const response = await apiClient.get(`/resources/${id}/translated-content`);
        return response?.data || {};
    };

    // The entities endpoint may answer with three different shapes; normalize
    // them all to { id, name, description, type, ... } so the UI has one format.
    const fetchEntities = async (id: string): Promise<ResourceListEntity[]> => {
        const entitiesRes = await apiClient.get<ResourceEntityRow[]>(`/resources/${id}/entities`);
        const entitiesData = entitiesRes.data || [];
        return entitiesData.map(row => {
            // raw row from getRawMany may be like { entity_id: 1, entity_name: 'Name', entity_type: 'Type' }
            if (row.entity_id || row.entity_name) {
                return {
                    id: row.entity_id ?? row.id,
                    name: row.entity_name ?? row.name,
                    description: row.entity_description ?? row.description ?? null,
                    type: row.entity_type ?? row.type,
                };
            }

            // If backend returned full EntityEntity objects with entityType relation
            if (row.entityType) {
                return {
                    id: row.id,
                    name: row.name,
                    description: row.description ?? null,
                    type: row.entityType?.name ?? null,
                    translations: row.translations,
                    aliases: row.aliases,
                };
            }

            return row;
        });
    };

    // Downloads are text, not binary, so the offline interceptor would happily
    // cache a whole document in localStorage. Skip the write-through cache while
    // keeping the auth header and the offline read fallback.
    const fetchRawFileText = async (id: string): Promise<string> => {
        const response = await apiClient.get(`/resources/${id}/download`, {
            responseType: 'text',
            headers: { 'x-offline-skip-cache': '1' },
        });
        return response.data;
    };

    const confirmExtraction = async (id: string): Promise<void> => {
        await apiClient.post(`/resources/${id}/confirm`);
    };

    const deleteResource = async (id: string): Promise<void> => {
        await apiClient.delete(`/resources/${id}`);
    };

    return {
        fetchTranslatedContent,
        fetchEntities,
        fetchRawFileText,
        confirmExtraction,
        deleteResource,
    };
}
