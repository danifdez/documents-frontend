export interface FavoriteCategory {
  id: number;
  name: string;
  parentId: number | null;
  createdAt?: string;
  updatedAt?: string;
}
