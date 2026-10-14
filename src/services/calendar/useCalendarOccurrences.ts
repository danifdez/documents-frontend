import apiClient from '../api';
import { useApiRequest } from '../../composables/useApiRequest';

// NOTE: complements useCalendarEvents.ts (pending consolidation).

export const useCalendarOccurrences = () => {
    const { isLoading, error, request } = useApiRequest();

    const unmarkOccurrenceComplete = (eventId: string | number, occurrenceStart: string): Promise<any> =>
        request('Failed to unmark occurrence', async () => {
            const encoded = encodeURIComponent(occurrenceStart);
            return (await apiClient.delete(`/calendar-events/${eventId}/occurrences/${encoded}/complete`)).data;
        });

    return {
        isLoading,
        error,
        unmarkOccurrenceComplete,
    };
};
