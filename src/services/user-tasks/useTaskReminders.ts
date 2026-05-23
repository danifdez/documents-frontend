import { getSocket } from '../notifications/notification';

export interface TaskReminderPayload {
  taskId: number;
  title: string;
  reminderAt: string;
}

export interface TaskMissedPayload {
  items: TaskReminderPayload[];
}

declare global {
  interface Window {
    taskReminders?: {
      showReminderNotification: (payload: TaskReminderPayload) => Promise<void>;
      showMissedAggregate: (payload: TaskMissedPayload) => Promise<void>;
      onNavigateToTask: (cb: (taskId: number) => void) => () => void;
      onNavigateMissedTasksPanel: (cb: () => void) => () => void;
    };
  }
}

let bound = false;

export function bindTaskReminders() {
  if (bound) return;
  bound = true;
  const socket = getSocket();
  socket.on('task:reminder', (payload: TaskReminderPayload) => {
    window.taskReminders?.showReminderNotification(payload);
  });
  socket.on('task:missed', (payload: TaskMissedPayload) => {
    window.taskReminders?.showMissedAggregate(payload);
  });
}
