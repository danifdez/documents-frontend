import { onSocketEvent } from '../notifications/notification';
import { useMissedAlarmsStore } from '../../store/missedAlarmsStore';

export interface CalendarAlarmPayload {
  eventId: number;
  occurrenceStart: string;
  title: string;
  alarmLabel: string | null;
  trackCompletion: boolean;
}

export interface CalendarMissedPayload {
  items: CalendarAlarmPayload[];
}

let bound = false;

export function bindCalendarAlarms() {
  if (bound) return;
  bound = true;
  const missed = useMissedAlarmsStore();
  onSocketEvent('calendar:alarm', (payload: CalendarAlarmPayload) => {
    window.calendarAlarms?.showAlarmNotification(payload);
  });
  onSocketEvent('calendar:missed', (payload: CalendarMissedPayload) => {
    missed.replaceItems(payload.items);
    window.calendarAlarms?.showMissedAggregate(payload);
  });
}
