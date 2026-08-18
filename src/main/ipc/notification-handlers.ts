import { IpcChannels } from '../../ipc/channels';
import type { IpcHandlerMap } from './registry';

export interface AlarmPayload {
  eventId: number;
  occurrenceStart: string;
  title: string;
  alarmLabel: string | null;
  trackCompletion: boolean;
}

export interface TaskReminderPayload {
  taskId: number;
  title: string;
  reminderAt: string;
}

interface NotificationHandlerDeps {
  showAlarmNotification: (payload: AlarmPayload) => void;
  showMissedAggregate: (payload: { items: AlarmPayload[] }) => void;
  showTaskReminderNotification: (payload: TaskReminderPayload) => void;
  showTaskMissedAggregate: (payload: { items: TaskReminderPayload[] }) => void;
}

export function createNotificationHandlers(deps: NotificationHandlerDeps): IpcHandlerMap {
  return {
    [IpcChannels.calendar.showAlarm]: (_, payload: AlarmPayload) => {
      deps.showAlarmNotification(payload);
    },
    [IpcChannels.calendar.showMissedAggregate]: (_, payload: { items: AlarmPayload[] }) => {
      deps.showMissedAggregate(payload);
    },
    [IpcChannels.task.showReminder]: (_, payload: TaskReminderPayload) => {
      deps.showTaskReminderNotification(payload);
    },
    [IpcChannels.task.showMissedAggregate]: (_, payload: { items: TaskReminderPayload[] }) => {
      deps.showTaskMissedAggregate(payload);
    },
  };
}
