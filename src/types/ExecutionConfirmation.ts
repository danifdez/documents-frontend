export interface ExecutionConfirmation {
    schemaVersion: 'confirmation/1';
    confirmationId: string;
    executionId: string;
    operationId: string;
    toolCallId: string;
    planHash: string;
    toolName: string;
    reason: string;
    prompt: string;
    scope: 'once' | 'execution';
    resources: Array<{
        resourceKey: string;
        mode: 'shared' | 'exclusive';
        kind?: string;
        id?: string;
        version?: string | number;
    }>;
    effects: Array<{
        effectClass: string;
        resourceKey: string;
        description: string;
        reversible: boolean;
        verificationRequired?: boolean;
    }>;
    status: 'pending' | 'approved' | 'denied' | 'expired';
    expiresAt: string | null;
    decidedAt: string | null;
}

export interface ExecutionConfirmationEnvelope {
    confirmation: ExecutionConfirmation;
    ownerId: number | null;
    taskType: string;
}
