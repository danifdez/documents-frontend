import apiClient from '../api';

export interface PermissionGroup {
    id: number;
    name: string;
    description: string | null;
    permissions: Record<string, boolean>;
}

export type PermissionGroupPayload = Partial<Omit<PermissionGroup, 'id'>>;

export const usePermissionGroups = () => {
    const fetchGroups = async (): Promise<PermissionGroup[]> => {
        const { data } = await apiClient.get<PermissionGroup[]>('/groups');
        return data;
    };

    const createGroup = async (payload: PermissionGroupPayload): Promise<PermissionGroup> => {
        const { data } = await apiClient.post<PermissionGroup>('/groups', payload);
        return data;
    };

    const updateGroup = async (id: number, payload: PermissionGroupPayload): Promise<PermissionGroup> => {
        const { data } = await apiClient.patch<PermissionGroup>(`/groups/${id}`, payload);
        return data;
    };

    const deleteGroup = async (id: number): Promise<void> => {
        await apiClient.delete(`/groups/${id}`);
    };

    return { fetchGroups, createGroup, updateGroup, deleteGroup };
};
