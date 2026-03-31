<template>
    <div class="h-full flex flex-col overflow-hidden">
        <div class="px-6 py-5 shrink-0">
            <!-- Breadcrumb -->
            <Breadcrumb :items="breadcrumbItems" />
            <!-- Header -->
            <CalendarHeader :currentDate="currentDate" :view="calendarView"
                @prev="navigatePrev" @next="navigateNext" @today="goToToday"
                @update:view="calendarView = $event" @newEvent="openCreateModal()" />
        </div>

        <!-- Calendar content -->
        <div class="flex-1 min-h-0 px-6 pb-4 overflow-hidden">
            <LoadingSpinner v-if="isLoading" size="lg" fullHeight />

            <div v-else class="h-full flex gap-4">
                <!-- Month view -->
                <CalendarGrid v-if="calendarView === 'month'"
                    :currentDate="currentDate" :events="events"
                    @dayClick="handleDayClick" @eventClick="handleEventClick"
                    class="h-full flex-1 min-w-0" />

                <!-- Week view -->
                <WeekGrid v-else
                    :currentDate="currentDate" :events="events"
                    @dayClick="handleDayClick" @eventClick="handleEventClick"
                    class="flex-1 min-w-0" />

                <!-- Day detail panel (always visible) -->
                <DayDetailPanel
                    :date="selectedDay" :events="events"
                    class="w-72 shrink-0"
                    @eventClick="handleEventClick"
                    @slotClick="openCreateModal" />
            </div>
        </div>

        <!-- Event Modal -->
        <EventModal v-model="showEventModal" :event="selectedEvent" :projects="projects" :defaultDate="selectedDate"
            :defaultProjectId="projectId" @submit="handleEventSubmit" @delete="handleEventDelete" />

        <!-- Delete Confirm -->
        <ConfirmModal :isOpen="showDeleteDialog" title="Delete Event"
            message="Are you sure you want to delete this event?" confirmText="Delete" cancelText="Cancel"
            confirmVariant="danger" @confirm="confirmDeleteEvent" @cancel="showDeleteDialog = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import { useCalendarEvents } from '../services/calendar/useCalendarEvents';
import { useProjectList } from '../services/projects/useProjectList';
import CalendarHeader from '../components/calendar/CalendarHeader.vue';
import CalendarGrid from '../components/calendar/CalendarGrid.vue';
import WeekGrid from '../components/calendar/WeekGrid.vue';
import DayDetailPanel from '../components/calendar/DayDetailPanel.vue';
import EventModal from '../components/calendar/EventModal.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import type { CalendarEvent } from '../types/CalendarEvent';
import apiClient from '../services/api';

const route = useRoute();
const { events, isLoading, loadEventsByRange, createEvent, updateEvent, deleteEvent } = useCalendarEvents();
const { projects, loadProjects } = useProjectList();

const projectId = computed(() => {
    const id = route.params.id;
    return id ? Number(id) : null;
});

const projectName = ref('');
const calendarView = ref<'month' | 'week'>('month');
const selectedDay = ref(new Date());

const breadcrumbItems = computed(() => {
    if (projectId.value) {
        return [
            { name: projectName.value || 'Project', path: `/project/${projectId.value}` },
            { name: 'Calendar' },
        ];
    }
    return [{ name: 'Calendar' }];
});

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
    await loadEventsByRange(start, end, projectId.value || undefined);
}

function navigatePrev() {
    const d = new Date(currentDate.value);
    if (calendarView.value === 'week') {
        d.setDate(d.getDate() - 7);
    } else {
        d.setMonth(d.getMonth() - 1);
    }
    currentDate.value = d;
}

function navigateNext() {
    const d = new Date(currentDate.value);
    if (calendarView.value === 'week') {
        d.setDate(d.getDate() + 7);
    } else {
        d.setMonth(d.getMonth() + 1);
    }
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
    selectedDay.value = date;
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
    if (projectId.value) {
        try {
            const res = await apiClient.get(`/projects/${projectId.value}`);
            projectName.value = res.data.name;
        } catch { }
    }
    await loadProjects();
    await loadMonthEvents();
});
</script>
