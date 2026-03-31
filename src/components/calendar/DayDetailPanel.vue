<template>
    <div class="h-full flex flex-col bg-surface-elevated rounded-xl border border-border overflow-hidden">
        <!-- Day header -->
        <div class="px-4 py-3 border-b border-border shrink-0">
            <p class="text-xs text-text-muted uppercase tracking-wider font-semibold">{{ dayLabel }}</p>
            <p class="text-lg font-semibold text-text-primary mt-0.5">{{ dayNumber }}</p>
        </div>

        <!-- All-day events -->
        <div v-if="allDayEvents.length > 0" class="px-2 py-1.5 border-b border-border shrink-0">
            <div v-for="event in allDayEvents" :key="event.id"
                class="px-2 py-1 rounded text-[11px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity mb-0.5"
                :style="{ backgroundColor: event.color + '20', color: event.color }"
                @click="$emit('eventClick', event)">
                {{ event.title }}
            </div>
        </div>

        <!-- Hourly timeline -->
        <div class="flex-1 min-h-0 overflow-y-auto" ref="scrollContainer">
            <div class="relative" style="height: 1152px;">
                <!-- Hour rows -->
                <div v-for="hour in 24" :key="hour - 1"
                    class="absolute w-full flex border-b border-border-light/50 hover:bg-surface-hover/50 transition-colors cursor-pointer"
                    :style="{ top: (hour - 1) * 48 + 'px', height: '48px' }"
                    @click="handleHourClick(hour - 1)">
                    <div class="w-10 shrink-0 pr-1.5 pt-0.5 text-right">
                        <span class="text-[10px] text-text-muted leading-none">{{ formatHourLabel(hour - 1) }}</span>
                    </div>
                    <div class="flex-1 border-l border-border-light/50"></div>
                </div>

                <!-- Timed events positioned by time -->
                <div v-for="evt in positionedEvents" :key="evt.event.id"
                    class="absolute rounded px-1.5 py-1 text-[11px] font-medium cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                    :style="{
                        top: evt.top + 'px',
                        height: Math.max(evt.height, 20) + 'px',
                        left: 'calc(2.5rem + 4px)',
                        right: '4px',
                        backgroundColor: evt.event.color + '30',
                        color: evt.event.color,
                        borderLeft: '3px solid ' + evt.event.color,
                    }"
                    @click.stop="$emit('eventClick', evt.event)">
                    <p class="truncate font-semibold">{{ evt.event.title }}</p>
                    <p class="text-[10px] opacity-75 truncate">{{ formatTime(evt.event) }}</p>
                </div>

                <!-- Current time indicator -->
                <div v-if="isToday" class="absolute pointer-events-none"
                    :style="{ top: currentTimeTop + 'px', left: '2.5rem', right: 0 }">
                    <div class="flex items-center">
                        <div class="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                        <div class="flex-1 h-px bg-red-500"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';

const props = defineProps<{
    date: Date;
    events: CalendarEvent[];
}>();

const emit = defineEmits(['eventClick', 'slotClick']);

const scrollContainer = ref<HTMLElement | null>(null);
const currentTimeTop = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const dayLabel = computed(() => {
    return props.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
});

const isToday = computed(() => {
    const today = new Date();
    return props.date.getFullYear() === today.getFullYear() &&
        props.date.getMonth() === today.getMonth() &&
        props.date.getDate() === today.getDate();
});

const dayNumber = computed(() => {
    if (isToday.value) return 'Today';
    return props.date.toLocaleDateString(undefined, { year: 'numeric' });
});

const dayEvents = computed(() => {
    const dayStart = new Date(props.date.getFullYear(), props.date.getMonth(), props.date.getDate());
    const dayEnd = new Date(props.date.getFullYear(), props.date.getMonth(), props.date.getDate(), 23, 59, 59);

    return props.events.filter(event => {
        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : start;
        return start <= dayEnd && end >= dayStart;
    });
});

const allDayEvents = computed(() => dayEvents.value.filter(e => e.allDay));

const timedEvents = computed(() => dayEvents.value.filter(e => !e.allDay));

const positionedEvents = computed(() => {
    return timedEvents.value.map(event => {
        const start = new Date(event.startDate);
        const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 60 * 60 * 1000);

        const startMinutes = start.getHours() * 60 + start.getMinutes();
        const endMinutes = end.getHours() * 60 + end.getMinutes();
        const duration = Math.max(endMinutes - startMinutes, 30);

        const top = (startMinutes / 60) * 48;
        const height = (duration / 60) * 48;

        return { event, top, height };
    });
});

function formatHourLabel(hour: number): string {
    const d = new Date();
    d.setHours(hour, 0, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatTime(event: CalendarEvent): string {
    const start = new Date(event.startDate);
    const time = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (event.endDate) {
        const end = new Date(event.endDate);
        const endTime = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        return `${time} - ${endTime}`;
    }
    return time;
}

function handleHourClick(hour: number) {
    const date = new Date(props.date.getFullYear(), props.date.getMonth(), props.date.getDate(), hour, 0, 0);
    emit('slotClick', date);
}

function updateCurrentTime() {
    const now = new Date();
    currentTimeTop.value = ((now.getHours() * 60 + now.getMinutes()) / 60) * 48;
}

function scrollToRelevant() {
    nextTick(() => {
        if (!scrollContainer.value) return;
        // Default scroll to 7:00 AM
        scrollContainer.value.scrollTop = 7 * 48;
    });
}

watch(() => props.date, () => {
    scrollToRelevant();
});

onMounted(() => {
    updateCurrentTime();
    timer = setInterval(updateCurrentTime, 60000);
    scrollToRelevant();
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>
