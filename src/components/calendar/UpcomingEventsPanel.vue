<template>
  <section>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Upcoming Events
      </h2>
      <div class="flex items-center gap-2">
        <button @click="$emit('create')"
          class="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent-subtle rounded-md transition-colors cursor-pointer">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          New
        </button>
        <router-link :to="calendarRoute"
          class="text-xs text-accent hover:text-accent-dark font-medium transition-colors">
          View calendar
        </router-link>
      </div>
    </div>

    <LoadingSpinner v-if="isLoading" size="lg" fullHeight />

    <div v-else-if="displayEvents.length > 0"
      class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      <div class="flex flex-col divide-y divide-border-light">
        <router-link v-for="event in displayEvents" :key="event.id" :to="calendarRoute"
          class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors duration-150 group">
          <div class="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            :style="{ backgroundColor: event.color + '20', color: event.color }">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-text-primary truncate">{{ event.title }}</p>
            <p class="text-[10px] text-text-muted">{{ formatEventDate(event) }}</p>
          </div>
          <span v-if="showProject && event.project"
            class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent shrink-0">
            {{ event.project.name }}
          </span>
        </router-link>
      </div>
    </div>

    <div v-else class="text-center py-8 rounded-xl border border-dashed border-border">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 mx-auto text-text-muted mb-2" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-xs text-text-muted">No upcoming events</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';
import LoadingSpinner from '../ui/LoadingSpinner.vue';

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
  const start = new Date(event.startDate);
  if (event.allDay) {
    return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
  return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' ' + start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
</script>
