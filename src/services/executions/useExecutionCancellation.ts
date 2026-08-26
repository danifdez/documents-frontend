import apiClient from '../api';

export interface ExecutionCancellation {
    rootExecutionId: string;
    status: 'queued' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
    cancellationRequestedAt: string;
    cancellationReason: string;
}

export function useExecutionCancellation() {
    const cancel = async (
        rootExecutionId: string,
        reason = 'Cancelled by user',
    ): Promise<ExecutionCancellation> => {
        const { data } = await apiClient.post<ExecutionCancellation>(
            `/executions/${rootExecutionId}/cancel`,
            { reason },
        );
        return data;
    };

    return { cancel };
}
