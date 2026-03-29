export interface Thread {
  id: number;
  name: string;
  description: string | null;
  parent: { id: number; name: string } | null;
  children: Thread[];
  project: { id: number; name: string } | null;
  docs: Array<{ id: number; name: string }>;
  createdAt: string;
  updatedAt: string;
}
