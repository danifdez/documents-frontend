<template>
    <div class="bg-surface-elevated rounded-xl border border-border overflow-hidden flex flex-col h-full">
        <!-- Day names header -->
        <div class="grid grid-cols-7 border-b border-border shrink-0">
            <div v-for="dayName in dayNames" :key="dayName"
                class="px-2 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider text-center border-r border-border-light last:border-r-0">
                {{ dayName }}
            </div>
        </div>

        <!-- Calendar grid - fills remaining space -->
        <div class="grid grid-cols-7 flex-1 auto-rows-fr">
            <CalendarDay
                v-for="(day, index) in calendarDays"
                :key="index"
                :day="day"
                :events="getEventsForDay(day.date)"
                @click="$emit('dayClick', $event)"
                @event-click="$emit('eventClick', $event)"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';
import CalendarDay from './CalendarDay.vue';

const props = defineProps<{
    currentDate: Date;
    events: CalendarEvent[];
}>();

defineEmits(['dayClick', 'eventClick']);

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const calendarDays = computed(() => {
    const year = props.currentDate.getFullYear();
    const month = props.currentDate.getMonth();
    const today = new Date();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }> = [];

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
        const date = new Date(year, month, -i);
        days.push({
            date,
            isCurrentMonth: false,
            isToday: isSameDay(date, today),
        });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        days.push({
            date,
            isCurrentMonth: true,
            isToday: isSameDay(date, today),
        });
    }

    // Next month padding to fill 6 rows
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        const date = new Date(year, month + 1, i);
        days.push({
            date,
            isCurrentMonth: false,
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

function getEventsForDay(date: Date): CalendarEvent[] {
    return props.events.filter(event => {
        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : start;

        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        return start <= dayEnd && end >= dayStart;
    });
}
</script>
