export interface UserTask {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';
  project?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
