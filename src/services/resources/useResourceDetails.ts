import axios from 'axios';
import apiClient from '../api';

export function useResourceDetails() {
    const fetchTranslatedContent = async (id: string): Promise<Record<string, any>> => {
        const response = await apiClient.get(`/resources/${id}/translated-content`);
        return response?.data || {};
    };

    // The entities endpoint may answer with three different shapes; normalize
    // them all to { id, name, description, type, ... } so the UI has one format.
    const fetchEntities = async (id: string): Promise<Record<string, any>[]> => {
        const entitiesRes = await apiClient.get(`/resources/${id}/entities`);
        const entitiesData = entitiesRes.data || [];
        return entitiesData.map((row: Record<string, any>) => {
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

    // Plain axios so the download request stays free of apiClient interceptors
    const fetchRawFileText = async (id: string): Promise<string> => {
        const response = await axios.get(`${apiClient.defaults.baseURL}/resources/${id}/download`, {
            responseType: 'text'
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
