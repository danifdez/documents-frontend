import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CalendarAlarmPayload } from '../services/calendar/useCalendarAlarms';

export const useMissedAlarmsStore = defineStore('missedAlarms', () => {
  const items = ref<CalendarAlarmPayload[]>([]);

  function replaceItems(next: CalendarAlarmPayload[]) {
    items.value = next;
  }

  function clear() {
    items.value = [];
  }

  return { items, replaceItems, clear };
});
