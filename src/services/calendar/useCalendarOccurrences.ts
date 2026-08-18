import { ref } from 'vue';
import apiClient from '../api';

// NOTE: complements useCalendarEvents.ts (pending consolidation).

export const useCalendarOccurrences = () => {
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const unmarkOccurrenceComplete = async (eventId: string | number, occurrenceStart: string): Promise<any> => {
        isLoading.value = true;
        error.value = null;

        try {
            const encoded = encodeURIComponent(occurrenceStart);
            const response = await apiClient.delete(`/calendar-events/${eventId}/occurrences/${encoded}/complete`);
            return response.data;
        } catch (err: any) {
            error.value = err.response?.data?.message || 'Failed to unmark occurrence';
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        isLoading,
        error,
        unmarkOccurrenceComplete,
    };
};
