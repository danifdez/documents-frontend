import { ref } from 'vue';
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

type ApiResponse<T> = { data: T };

function errorMessage(value: unknown, fallback: string): string {
    return value instanceof Error && value.message ? value.message : fallback;
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
    }): Promise<void> => {
        return _modify('/relationships', 'post', dto);
    };

    const updateRelationship = (dto: {
        subjectId: number;
        predicate: string;
        objectId: number;
        newPredicate: string;
        resourceId: number;
    }): Promise<void> => {
        return _modify('/relationships', 'put', dto);
    };

    const deleteRelationship = (dto: {
        subjectId: number;
        predicate: string;
        objectId: number;
        resourceId: number;
    }): Promise<void> => {
        return _modify('/relationships', 'delete', { data: dto });
    };

    const extractRelationships = (resourceId: number): Promise<void> => {
        isLoading.value = true;
        error.value = null;

        return new Promise<void>((resolve) => {
            const onComplete = (responseData: { resourceId?: number }) => {
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
                .catch((err: unknown) => {
                    unsubscribe();
                    error.value = errorMessage(err, 'Failed to extract relationships');
                    isLoading.value = false;
                    resolve();
                });
        });
    };

    // These view helpers do not alter the relationship request state.
    const fetchProjectResources = (projectId: number): Promise<ProjectResource[]> => {
        return apiClient.get(`/resources/project/${projectId}`)
            .then((response: ApiResponse<ProjectResource[]>) =>
                (response.data || []).map(({ id, name }) => ({ id, name })),
            );
    };

    const fetchProjectName = (projectId: number): Promise<string> => {
        return apiClient.get(`/projects/${projectId}`)
            .then((response: ApiResponse<{ name: string }>) => response.data.name);
    };

    const _query = (url: string): Promise<RelationshipData> => {
        isLoading.value = true;
        error.value = null;
        return apiClient.get(url)
            .then((response: ApiResponse<Partial<RelationshipData>>) => {
                data.value = {
                    entities: response.data?.entities || [],
                    relationships: response.data?.relationships || [],
                };
                return data.value;
            })
            .catch((err: unknown) => {
                error.value = errorMessage(err, 'Failed to query relationships');
                return { entities: [], relationships: [] };
            })
            .finally(() => {
                isLoading.value = false;
            });
    };

    const _modify = (
        url: string,
        method: 'post' | 'put' | 'delete',
        payload: object | { data: object },
    ): Promise<void> => {
        isLoading.value = true;
        error.value = null;
        const request = method === 'delete' && 'data' in payload
            ? apiClient.delete(url, { data: payload.data })
            : method === 'post'
                ? apiClient.post(url, payload)
                : apiClient.put(url, payload);

        return request
            .then(() => undefined)
            .catch((err: unknown) => {
                error.value = errorMessage(err, 'Failed to modify relationship');
            })
            .finally(() => {
                isLoading.value = false;
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
