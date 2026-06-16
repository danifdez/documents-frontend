<template>
  <SectionPanel title="Upcoming Events" color="accent"
    :loading="isLoading" :empty="displayEvents.length === 0"
    empty-text="No upcoming events">
    <template #icon>
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="1.75">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </template>

    <template #actions>
      <button @click="$emit('create')"
        class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-subtle rounded-md transition-colors cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
        </svg>
        New
      </button>
      <router-link :to="calendarRoute" class="link-action">View calendar</router-link>
    </template>

    <ListRow v-for="event in displayEvents" :key="`${event.id}-${event.occurrenceStart ?? event.startDate}`"
      :to="calendarRoute">
      <span class="event-dot" :style="{ backgroundColor: event.color || 'var(--color-accent)' }"></span>
      <div class="min-w-0 flex-1">
        <p class="text-sm text-text-primary truncate">{{ event.title }}</p>
        <p class="text-[11px] text-text-muted">{{ formatEventDate(event) }}</p>
      </div>
      <Badge v-if="showProject && event.project" variant="accent">{{ event.project.name }}</Badge>
    </ListRow>
  </SectionPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';
import SectionPanel from '../ui/SectionPanel.vue';
import ListRow from '../ui/ListRow.vue';
import Badge from '../ui/Badge.vue';

const props = withDefaults(defineProps<{
  events: CalendarEvent[];
  isLoading: boolean;
  limit?: number;
  showProject?: boolean;
  projectId?: number | string | null;
}>(), {
  limit: 5,
  showProject: true,
  projectId: null,
});

const calendarRoute = computed(() => {
  if (props.projectId) return `/project/${props.projectId}/calendar`;
  return '/calendar';
});

defineEmits<{
  create: [];
}>();

const displayEvents = computed(() => props.events.slice(0, props.limit));

function formatEventDate(event: CalendarEvent): string {
  const start = new Date(event.occurrenceStart ?? event.startDate);
  if (event.allDay) {
    return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' ' + start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
</script>
