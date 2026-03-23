<template>
    <div @click="$emit('click', day.date)"
        class="p-1.5 border-b border-r border-border-light cursor-pointer transition-colors overflow-hidden"
        :class="{
            'bg-surface-elevated': day.isCurrentMonth,
            'bg-surface/50': !day.isCurrentMonth,
            'hover:bg-surface-hover': true,
        }">
        <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium" :class="{
                'text-white bg-accent rounded-full w-6 h-6 flex items-center justify-center': day.isToday,
                'text-text-primary': day.isCurrentMonth && !day.isToday,
                'text-text-muted': !day.isCurrentMonth,
            }">
                {{ day.date.getDate() }}
            </span>
        </div>

        <div class="flex flex-col gap-0.5">
            <div v-for="event in visibleEvents" :key="event.id"
                @click.stop="$emit('eventClick', event)"
                class="px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer hover:opacity-80 transition-opacity"
                :style="{ backgroundColor: event.color + '20', color: event.color }">
                {{ event.title }}
            </div>
            <div v-if="overflowCount > 0" class="text-[10px] text-text-muted px-1.5">
                +{{ overflowCount }} more
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';

const MAX_VISIBLE = 3;

const props = defineProps<{
    day: {
        date: Date;
        isCurrentMonth: boolean;
        isToday: boolean;
    };
    events: CalendarEvent[];
}>();

defineEmits(['click', 'eventClick']);

const visibleEvents = computed(() => props.events.slice(0, MAX_VISIBLE));
const overflowCount = computed(() => Math.max(0, props.events.length - MAX_VISIBLE));
</script>
