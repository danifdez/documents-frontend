<template>
    <div class="bg-surface-elevated rounded-2xl border border-border overflow-hidden flex flex-col h-full">
        <!-- Day names header -->
        <div class="grid grid-cols-7 border-b border-border shrink-0">
            <div v-for="(day, i) in weekDays" :key="i"
                class="px-2 py-2 text-center border-r border-border-light last:border-r-0 cursor-pointer hover:bg-surface-hover transition-colors"
                :class="{ 'bg-accent/5': day.isToday }"
                @click="$emit('dayClick', day.date)">
                <div class="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    {{ dayNames[i] }}
                </div>
                <div class="text-sm font-medium mt-0.5"
                    :class="day.isToday ? 'text-white bg-accent rounded-full w-7 h-7 flex items-center justify-center mx-auto' : 'text-text-primary'">
                    {{ day.date.getDate() }}
                </div>
            </div>
        </div>

        <!-- Week events grid -->
        <div class="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto">
            <div v-for="(day, i) in weekDays" :key="i"
                class="border-r border-border-light last:border-r-0 p-1.5 min-h-[120px]"
                :class="{ 'bg-accent/5': day.isToday }">
                <div class="flex flex-col gap-1">
                    <div v-for="event in getEventsForDay(day.date)" :key="`${event.id}-${event.occurrenceStart ?? event.startDate}`"
                        @click.stop="$emit('eventClick', event)"
                        class="px-2 py-1.5 rounded text-[11px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                        :class="{ 'opacity-50 line-through': event.trackCompletion && event.completed }"
                        :style="{ backgroundColor: event.color + '20', color: event.color }">
                        <p class="truncate">
                            <span v-if="event.trackCompletion && event.completed" class="mr-0.5">✓</span>{{ event.title }}
                        </p>
                        <p class="text-[10px] opacity-75 mt-0.5" v-if="!event.allDay">
                            {{ formatTime(event) }}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';

const props = defineProps<{
    currentDate: Date;
    events: CalendarEvent[];
}>();

defineEmits(['dayClick', 'eventClick']);

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const weekDays = computed(() => {
    const today = new Date();
    const d = new Date(props.currentDate);
    // Get Monday of current week
    let dow = d.getDay() - 1;
    if (dow < 0) dow = 6;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dow);

    const days: Array<{ date: Date; isToday: boolean }> = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        days.push({
            date,
            isToday: isSameDay(date, today),
        });
    }
    return days;
});

function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function eventStart(event: CalendarEvent): Date {
    return new Date(event.occurrenceStart ?? event.startDate);
}

function eventEnd(event: CalendarEvent): Date | null {
    const raw = event.occurrenceEnd ?? event.endDate;
    return raw ? new Date(raw) : null;
}

function getEventsForDay(date: Date): CalendarEvent[] {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    return props.events
        .filter(event => {
            const start = eventStart(event);
            const end = eventEnd(event) ?? start;
            return start <= dayEnd && end >= dayStart;
        })
        .sort((a, b) => {
            if (a.allDay && !b.allDay) return -1;
            if (!a.allDay && b.allDay) return 1;
            return eventStart(a).getTime() - eventStart(b).getTime();
        });
}

function formatTime(event: CalendarEvent): string {
    return eventStart(event).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
</script>
