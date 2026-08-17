import apiClient from '../api';

export interface User {
    id: number;
    username: string;
    displayName: string | null;
    permissions: Record<string, boolean>;
    groupId: number | null;
    active: boolean;
}

export type UserPayload = Partial<Omit<User, 'id'>> & { password?: string };

export const useUsers = () => {
    const fetchUsers = async (): Promise<User[]> => {
        const { data } = await apiClient.get<User[]>('/users');
        return data;
    };

    const createUser = async (payload: UserPayload): Promise<User> => {
        const { data } = await apiClient.post<User>('/users', payload);
        return data;
    };

    const updateUser = async (id: number, payload: UserPayload): Promise<User> => {
        const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
        return data;
    };

    const deleteUser = async (id: number): Promise<void> => {
        await apiClient.delete(`/users/${id}`);
    };

    return { fetchUsers, createUser, updateUser, deleteUser };
};
