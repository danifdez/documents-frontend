import apiClient from '../api';
import type {
    ExecutionConfirmation,
    ExecutionConfirmationEnvelope,
} from '../../types/ExecutionConfirmation';

export function useExecutionConfirmations() {
    const listPending = async (): Promise<ExecutionConfirmationEnvelope[]> => {
        const { data } = await apiClient.get<ExecutionConfirmationEnvelope[]>(
            '/execution-confirmations',
        );
        return data;
    };

    const decide = async (
        confirmationId: string,
        decision: 'approved' | 'denied',
    ): Promise<ExecutionConfirmation> => {
        const { data } = await apiClient.post<ExecutionConfirmation>(
            `/execution-confirmations/${confirmationId}/decision`,
            { decision },
        );
        return data;
    };

    return { listPending, decide };
}
