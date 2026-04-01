import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { getSocket } from '../notifications/notification';

export interface RelationshipEntity {
    id: number | string;
    name: string;
    type: string;
}

export interface Relationship {
    source: number | string;
    target: number | string;
    predicate: string;
    confidence: number;
    resource_id?: number;
}

export interface RelationshipData {
    entities: RelationshipEntity[];
    relationships: Relationship[];
}

export function useRelationships() {
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const data = ref<RelationshipData>({ entities: [], relationships: [] });

    const fetchAll = (): Promise<RelationshipData> => {
        return _query('/relationships/all');
    };

    const fetchByResource = (resourceId: number): Promise<RelationshipData> => {
        return _query(`/relationships/resource/${resourceId}`);
    };

    const fetchByProject = (projectId: number, resourceIds?: number[]): Promise<RelationshipData> => {
        let url = `/relationships/project/${projectId}`;
        if (resourceIds && resourceIds.length > 0) {
            url += `?resourceIds=${resourceIds.join(',')}`;
        }
        return _query(url);
    };

    const createRelationship = (dto: {
        subjectId: number;
        predicate: string;
        objectId: number;
        resourceId: number;
        projectId?: number;
    }): Promise<void> => {
        return _modify('/relationships', 'post', dto, 'relationshipModifyResponse');
    };

    const updateRelationship = (dto: {
        subjectId: number;
        predicate: string;
        objectId: number;
        newPredicate: string;
        resourceId: number;
    }): Promise<void> => {
        return _modify('/relationships', 'put', dto, 'relationshipModifyResponse');
    };

    const deleteRelationship = (dto: {
        subjectId: number;
        predicate: string;
        objectId: number;
        resourceId: number;
    }): Promise<void> => {
        return _modify('/relationships', 'delete', { data: dto }, 'relationshipModifyResponse');
    };

    const extractRelationships = (resourceId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        return new Promise<void>((resolve) => {
            const socket = getSocket();

            const onComplete = (responseData: any) => {
                if (responseData.resourceId === resourceId) {
                    socket.off('relationshipExtractionComplete', onComplete);
                    isLoading.value = false;
                    resolve();
                }
            };
            socket.on('relationshipExtractionComplete', onComplete);

            apiClient.post(`/relationships/resource/${resourceId}/extract`)
                .catch((err: any) => {
                    socket.off('relationshipExtractionComplete', onComplete);
                    error.value = err.message || 'Failed to extract relationships';
                    isLoading.value = false;
                    resolve();
                });
        });
    };

    const _query = (url: string): Promise<RelationshipData> => {
        isLoading.value = true;
        error.value = null;
        const requestId = uuidv4();
        const separator = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${separator}requestId=${requestId}`;

        return new Promise<RelationshipData>((resolve) => {
            const socket = getSocket();

            const onResponse = (responseData: any) => {
                if (responseData.requestId === requestId) {
                    socket.off('relationshipQueryResponse', onResponse);
                    isLoading.value = false;
                    data.value = {
                        entities: responseData.entities || [],
                        relationships: responseData.relationships || [],
                    };
                    resolve(data.value);
                }
            };
            socket.on('relationshipQueryResponse', onResponse);

            apiClient.get(fullUrl)
                .catch((err: any) => {
                    socket.off('relationshipQueryResponse', onResponse);
                    error.value = err.message || 'Failed to query relationships';
                    isLoading.value = false;
                    resolve({ entities: [], relationships: [] });
                });
        });
    };

    const _modify = (url: string, method: string, payload: any, event: string): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        const requestId = uuidv4();

        return new Promise<void>((resolve) => {
            const socket = getSocket();

            const onResponse = (responseData: any) => {
                if (responseData.requestId === requestId) {
                    socket.off(event, onResponse);
                    isLoading.value = false;
                    resolve();
                }
            };
            socket.on(event, onResponse);

            const body = method === 'delete'
                ? { ...payload.data, requestId }
                : { ...payload, requestId };

            const request = method === 'delete'
                ? apiClient.delete(url, { data: body })
                : (apiClient as any)[method](url, body);

            request.catch((err: any) => {
                socket.off(event, onResponse);
                error.value = err.message || 'Failed to modify relationship';
                isLoading.value = false;
                resolve();
            });
        });
    };

    return {
        isLoading,
        error,
        data,
        fetchAll,
        fetchByResource,
        fetchByProject,
        createRelationship,
        updateRelationship,
        deleteRelationship,
        extractRelationships,
    };
}
