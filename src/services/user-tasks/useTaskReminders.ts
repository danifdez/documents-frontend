import { onSocketEvent } from '../notifications/notification';

export interface TaskReminderPayload {
  taskId: number;
  title: string;
  reminderAt: string;
}

export interface TaskMissedPayload {
  items: TaskReminderPayload[];
}

let bound = false;

export function bindTaskReminders() {
  if (bound) return;
  bound = true;
  onSocketEvent('task:reminder', (payload: TaskReminderPayload) => {
    window.taskReminders?.showReminderNotification(payload);
  });
  onSocketEvent('task:missed', (payload: TaskMissedPayload) => {
    window.taskReminders?.showMissedAggregate(payload);
  });
}
