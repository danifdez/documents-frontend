import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { subscribeExecutionPublication } from '../notifications/executionPublication';

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

export interface ProjectResource {
    id: number;
    name: string;
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
            const onComplete = (responseData: any) => {
                if (responseData.resourceId === resourceId) {
                    unsubscribe();
                    isLoading.value = false;
                    resolve();
                }
            };
            let unsubscribe: () => void = () => undefined;
            unsubscribe = subscribeExecutionPublication(
                'relationshipExtractionComplete',
                onComplete,
            );

            apiClient.post(`/relationships/resource/${resourceId}/extract`)
                .catch((err: any) => {
                    unsubscribe();
                    error.value = err.message || 'Failed to extract relationships';
                    isLoading.value = false;
                    resolve();
                });
        });
    };

    // Plain REST helpers for the relationships view filters — unlike the
    // socket-backed calls above, they don't touch isLoading/error
    const fetchProjectResources = (projectId: number): Promise<ProjectResource[]> => {
        return apiClient.get(`/resources/project/${projectId}`)
            .then((res: any) => (res.data || []).map((r: any) => ({ id: r.id, name: r.name })));
    };

    const fetchProjectName = (projectId: number): Promise<string> => {
        return apiClient.get(`/projects/${projectId}`)
            .then((res: any) => res.data.name);
    };

    const _query = (url: string): Promise<RelationshipData> => {
        isLoading.value = true;
        error.value = null;
        const requestId = uuidv4();
        const separator = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${separator}requestId=${requestId}`;

        return new Promise<RelationshipData>((resolve) => {
            const onResponse = (responseData: any) => {
                if (responseData.requestId === requestId) {
                    unsubscribe();
                    isLoading.value = false;
                    data.value = {
                        entities: responseData.entities || [],
                        relationships: responseData.relationships || [],
                    };
                    resolve(data.value);
                }
            };
            let unsubscribe: () => void = () => undefined;
            unsubscribe = subscribeExecutionPublication(
                'relationshipQueryResponse',
                onResponse,
            );

            apiClient.get(fullUrl)
                .catch((err: any) => {
                    unsubscribe();
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
            const onResponse = (responseData: any) => {
                if (responseData.requestId === requestId) {
                    unsubscribe();
                    isLoading.value = false;
                    resolve();
                }
            };
            let unsubscribe: () => void = () => undefined;
            unsubscribe = subscribeExecutionPublication(event, onResponse);

            const body = method === 'delete'
                ? { ...payload.data, requestId }
                : { ...payload, requestId };

            const request = method === 'delete'
                ? apiClient.delete(url, { data: body })
                : (apiClient as any)[method](url, body);

            request.catch((err: any) => {
                unsubscribe();
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
        fetchProjectResources,
        fetchProjectName,
    };
}
