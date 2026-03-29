export type TimelineLayoutType = 'horizontal' | 'vertical';

export interface TimelineEpoch {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  color: string;
}

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
  epochs: TimelineEpoch[] | null;
  notes: string | null;
  syncDatasetId: number | null;
  syncMapping: Record<string, string> | null;
  layoutType: TimelineLayoutType;
  axisBreaks: boolean;
  project: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
