export interface Note {
  id: number;
  title: string;
  content: string | null;
  project?: { id: number; name: string } | null;
  thread?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
