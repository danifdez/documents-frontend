export interface AlarmDescriptor {
  offsetMinutes: number;
  label?: string;
}

// When returned by /calendar-events/range, the same `id` may appear in multiple
// entries (one per expanded occurrence). Use `${id}-${occurrenceStart}` as the
// Vue key in lists. For range responses `occurrenceStart`/`occurrenceEnd` carry
// the per-occurrence date; for other endpoints they may be absent.
export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  occurrenceStart?: string;
  occurrenceEnd?: string | null;
  color: string;
  allDay: boolean;
  recurrenceRule: string | null;
  alarm: AlarmDescriptor | null;
  // `trackCompletion` and `completed` are only populated by /calendar-events/range
  // (the per-occurrence response). Single-event endpoints expose
  // `trackCompletion` from the entity but never `completed`, which is derived
  // from the join with `event_occurrence_completion`.
  trackCompletion?: boolean;
  completed?: boolean;
  project?: { id: number; name: string } | null;
  createdAt?: string;
  updatedAt?: string;
}
