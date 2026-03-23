export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  color: string;
  allDay: boolean;
  project?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}
