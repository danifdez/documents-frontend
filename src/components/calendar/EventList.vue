<template>
    <div>
        <div v-if="isLoading" class="flex justify-center py-4">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
        </div>

        <div v-else-if="events.length > 0" class="flex flex-col gap-1.5">
            <div v-for="event in events" :key="event.id"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface-hover transition-colors cursor-pointer"
                @click="$emit('eventClick', event)">
                <div class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: event.color }"></div>
                <div class="min-w-0 flex-1">
                    <p class="text-sm text-text-primary truncate">{{ event.title }}</p>
                    <p class="text-[10px] text-text-muted">{{ formatEventDate(event) }}</p>
                </div>
                <span v-if="event.project" class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent shrink-0">
                    {{ event.project.name }}
                </span>
            </div>
        </div>

        <div v-else class="text-center py-6 rounded-xl border border-dashed border-border">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mx-auto text-text-muted mb-1.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p class="text-xs text-text-muted">No upcoming events.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { CalendarEvent } from '../../types/CalendarEvent';

defineProps<{
    events: CalendarEvent[];
    isLoading: boolean;
}>();

defineEmits(['eventClick']);

function formatEventDate(event: CalendarEvent): string {
    const start = new Date(event.startDate);
    if (event.allDay) {
        return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' ' + start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
</script>
