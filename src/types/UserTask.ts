export interface UserTask {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';
  reminderAt?: string | null;
  project?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
