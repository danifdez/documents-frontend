<template>
    <div class="h-full flex flex-col overflow-hidden">
        <div class="px-6 py-5 shrink-0">
            <!-- Header -->
            <CalendarHeader :currentDate="currentDate" @prev="prevMonth" @next="nextMonth" @today="goToToday"
                @newEvent="openCreateModal()" />
        </div>

        <!-- Calendar Grid - fills remaining space -->
        <div class="flex-1 min-h-0 px-6 pb-4 overflow-hidden">
            <!-- Loading -->
            <LoadingSpinner v-if="isLoading" size="lg" fullHeight />

            <CalendarGrid v-else :currentDate="currentDate" :events="events" @dayClick="handleDayClick"
                @eventClick="handleEventClick" class="h-full" />
        </div>

        <!-- Event Modal -->
        <EventModal v-model="showEventModal" :event="selectedEvent" :projects="projects" :defaultDate="selectedDate"
            @submit="handleEventSubmit" @delete="handleEventDelete" />

        <!-- Delete Confirm -->
        <ConfirmModal :isOpen="showDeleteDialog" title="Delete Event"
            message="Are you sure you want to delete this event?" confirmText="Delete" cancelText="Cancel"
            confirmVariant="danger" @confirm="confirmDeleteEvent" @cancel="showDeleteDialog = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import { useCalendarEvents } from '../services/calendar/useCalendarEvents';
import { useProjectList } from '../services/projects/useProjectList';
import CalendarHeader from '../components/calendar/CalendarHeader.vue';
import CalendarGrid from '../components/calendar/CalendarGrid.vue';
import EventModal from '../components/calendar/EventModal.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import type { CalendarEvent } from '../types/CalendarEvent';

const { events, isLoading, loadEventsByRange, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
const { projects, loadProjects } = useProjectList();

const currentDate = ref(new Date());
const showEventModal = ref(false);
const showDeleteDialog = ref(false);
const selectedEvent = ref<CalendarEvent | null>(null);
const selectedDate = ref<Date>(new Date());

function getMonthRange(date: Date): { start: string; end: string } {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month - 1, 25).toISOString();
    const end = new Date(year, month + 2, 7).toISOString();
    return { start, end };
}

async function loadMonthEvents() {
    const { start, end } = getMonthRange(currentDate.value);
    await loadEventsByRange(start, end);
}

function prevMonth() {
    const d = new Date(currentDate.value);
    d.setMonth(d.getMonth() - 1);
    currentDate.value = d;
}

function nextMonth() {
    const d = new Date(currentDate.value);
    d.setMonth(d.getMonth() + 1);
    currentDate.value = d;
}

function goToToday() {
    currentDate.value = new Date();
}

function openCreateModal(date?: Date) {
    selectedEvent.value = null;
    selectedDate.value = date || new Date();
    showEventModal.value = true;
}

function handleDayClick(date: Date) {
    openCreateModal(date);
}

function handleEventClick(event: CalendarEvent) {
    selectedEvent.value = event;
    showEventModal.value = true;
}

async function handleEventSubmit(data: Record<string, any>) {
    try {
        if (data.id) {
            const { id, ...updateData } = data;
            await updateEvent(id, updateData);
        } else {
            await createEvent(data);
        }
        await loadMonthEvents();
    } catch (err) {
        console.error('Error saving event:', err);
    }
}

function handleEventDelete() {
    showEventModal.value = false;
    showDeleteDialog.value = true;
}

async function confirmDeleteEvent() {
    showDeleteDialog.value = false;
    if (!selectedEvent.value) return;
    try {
        await deleteEvent(selectedEvent.value.id);
        await loadMonthEvents();
    } catch (err) {
        console.error('Error deleting event:', err);
    }
    selectedEvent.value = null;
}

watch(currentDate, () => {
    loadMonthEvents();
});

onMounted(async () => {
    await loadProjects();
    await loadMonthEvents();
});
</script>
