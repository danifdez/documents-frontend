import { getSocket } from '../notifications/notification';
import { useMissedAlarmsStore } from '../../store/missedAlarmsStore';

export interface CalendarAlarmPayload {
  eventId: number;
  occurrenceStart: string;
  title: string;
  alarmLabel: string | null;
}

export interface CalendarMissedPayload {
  items: CalendarAlarmPayload[];
}

declare global {
  interface Window {
    calendarAlarms?: {
      showAlarmNotification: (payload: CalendarAlarmPayload) => Promise<void>;
      showMissedAggregate: (payload: CalendarMissedPayload) => Promise<void>;
      onNavigateToEvent: (cb: (eventId: number) => void) => () => void;
      onNavigateMissedPanel: (cb: () => void) => () => void;
    };
  }
}

let bound = false;

export function bindCalendarAlarms() {
  if (bound) return;
  bound = true;
  const socket = getSocket();
  const missed = useMissedAlarmsStore();
  socket.on('calendar:alarm', (payload: CalendarAlarmPayload) => {
    window.calendarAlarms?.showAlarmNotification(payload);
  });
  socket.on('calendar:missed', (payload: CalendarMissedPayload) => {
    missed.replaceItems(payload.items);
    window.calendarAlarms?.showMissedAggregate(payload);
  });
}
