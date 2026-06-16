<template>
  <div class="flex flex-col h-full max-w-3xl mx-auto px-5 py-4">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-lg font-semibold text-text-primary">Missed alerts</h1>
      <router-link to="/calendar" class="text-xs text-accent hover:underline">Back to calendar</router-link>
    </div>

    <div v-if="items.length === 0" class="rounded-2xl border border-dashed border-border py-10 text-center">
      <p class="text-sm text-text-muted">No missed alerts.</p>
    </div>

    <div v-else class="flex flex-col gap-2">
      <div v-for="item in items" :key="`${item.eventId}-${item.occurrenceStart}`"
        class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-border bg-surface-elevated">
        <div class="min-w-0">
          <p class="text-sm text-text-primary truncate">{{ item.alarmLabel || item.title }}</p>
          <p class="text-xs text-text-muted">{{ formatTime(item.occurrenceStart) }}</p>
        </div>
        <button @click="openEvent(item.eventId)"
          class="text-xs px-2 py-1 rounded-md border border-border hover:bg-surface-hover transition-colors">
          Open event
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useMissedAlarmsStore } from '../../store/missedAlarmsStore';

const router = useRouter();
const store = useMissedAlarmsStore();
const items = computed(() => store.items);

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function openEvent(eventId: number) {
  router.push({ path: '/calendar', query: { eventId: String(eventId) } });
}
</script>
