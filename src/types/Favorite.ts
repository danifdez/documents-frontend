import type { FavoriteCategory } from './FavoriteCategory';

export interface Favorite {
  id: number;
  url: string;
  title: string;
  categoryId: number | null;
  category?: FavoriteCategory | null;
  createdAt?: string;
  updatedAt?: string;
}
