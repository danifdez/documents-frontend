export interface Doc {
  id: number;
  name: string;
  content: string | null;
  citationFormat: string;
  thread: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
  resource: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
