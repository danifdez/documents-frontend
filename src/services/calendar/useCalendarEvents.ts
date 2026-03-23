import { ref } from 'vue';
import apiClient from '../api';
import type { CalendarEvent } from '../../types/CalendarEvent';

export function useCalendarEvents() {
    const events = ref<CalendarEvent[]>([]);
    const event = ref<CalendarEvent | null>(null);
    const error = ref(null);
    const isLoading = ref(false);

    const loadEvents = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/calendar-events');
            events.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            events.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadEventsByProject = async (projectId: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/calendar-events/project/${projectId}`);
            events.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            events.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadEventsByRange = async (start: string, end: string, projectId?: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const params: Record<string, string> = { start, end };
            if (projectId) params.projectId = String(projectId);
            const response = await apiClient.get('/calendar-events/range', { params });
            events.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            events.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadEvent = async (id: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/calendar-events/${id}`);
            event.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            event.value = null;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createEvent = async (data: Partial<CalendarEvent>) => {
        try {
            const response = await apiClient.post('/calendar-events', data);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const updateEvent = async (id: string | number, data: Partial<CalendarEvent>) => {
        try {
            const response = await apiClient.patch(`/calendar-events/${id}`, data);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const deleteEvent = async (id: string | number) => {
        try {
            const response = await apiClient.delete(`/calendar-events/${id}`);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    return {
        events,
        event,
        error,
        isLoading,
        loadEvents,
        loadEventsByProject,
        loadEventsByRange,
        loadEvent,
        createEvent,
        updateEvent,
        deleteEvent,
    };
}
