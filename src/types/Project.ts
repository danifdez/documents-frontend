export interface Project {
    id: number;
    name: string;
    description: string | null;
    status: 'active' | 'archived';
    createdAt: string;
    updatedAt: string;
}
