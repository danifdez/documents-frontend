export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  color: string;
  docId?: number;
  resourceId?: number;
}

export interface TimelineRecord {
  id: number;
  name: string;
  timelineData: TimelineEvent[] | null;
  project: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
