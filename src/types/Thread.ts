export interface Thread {
  id: number;
  name: string;
  description: string | null;
  parent: number | null;
  project: { id: number; name: string } | null;
  docs: Array<{ id: number; name: string }>;
  createdAt: string;
  updatedAt: string;
}
