<template>
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <h2 class="text-lg font-semibold text-text-primary tracking-tight capitalize">
                {{ headerLabel }}
            </h2>
            <div class="flex items-center gap-1">
                <button @click="$emit('prev')"
                    class="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button @click="$emit('today')"
                    class="px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                    Today
                </button>
                <button @click="$emit('next')"
                    class="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <!-- View toggle -->
            <div class="flex items-center bg-surface rounded-lg border border-border p-0.5">
                <button @click="$emit('update:view', 'month')"
                    class="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    :class="view === 'month' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'"
                    title="Month view">
                    Month
                </button>
                <button @click="$emit('update:view', 'week')"
                    class="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    :class="view === 'week' ? 'bg-accent text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'"
                    title="Week view">
                    Week
                </button>
            </div>

            <button @click="$emit('newEvent')"
                class="inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-dark text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clip-rule="evenodd" />
                </svg>
                <span>New Event</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    currentDate: Date;
    view: 'month' | 'week';
}>();

defineEmits(['prev', 'next', 'today', 'newEvent', 'update:view']);

const headerLabel = computed(() => {
    if (props.view === 'week') {
        const d = new Date(props.currentDate);
        let dow = d.getDay() - 1;
        if (dow < 0) dow = 6;
        const monday = new Date(d);
        monday.setDate(d.getDate() - dow);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const monStr = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const sunStr = sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${monStr} – ${sunStr}`;
    }
    return props.currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
});
</script>
