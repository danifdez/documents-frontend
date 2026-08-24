import {
    dispatchExecutionPublication,
    isExecutionPublicationKnown,
    resetExecutionPublicationDeduplication,
    subscribeExecutionPublication,
} from './executionPublication';

describe('dispatchExecutionPublication', () => {
    beforeEach(() => resetExecutionPublicationDeduplication());

    it('dispatches a canonical publication to existing event consumers once', () => {
        const listener = vi.fn();
        const envelope = {
            outboxId: '366fbda9-e798-45d1-b019-18f05a44b2a0',
            socketEvent: 'askResponse',
            payload: { response: 'done' },
        };

        expect(dispatchExecutionPublication(envelope, () => [listener])).toBe(
            true,
        );
        expect(dispatchExecutionPublication(envelope, () => [listener])).toBe(
            false,
        );
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({ response: 'done' });
        expect(isExecutionPublicationKnown(envelope.outboxId)).toBe(true);
    });

    it('rejects malformed and recursive publications', () => {
        const listener = vi.fn();
        expect(
            dispatchExecutionPublication(
                {
                    outboxId: 'message-id',
                    socketEvent: 'execution:publication',
                    payload: {},
                },
                () => [listener],
            ),
        ).toBe(false);
        expect(listener).not.toHaveBeenCalled();
    });

    it('persists the publication identity in workspace storage', () => {
        const listener = vi.fn();
        const envelope = {
            outboxId: '9e30ac45-7678-47ca-a2b0-4ac0f88372d8',
            socketEvent: 'notification',
            payload: { type: 'summarize' },
        };
        dispatchExecutionPublication(envelope, () => [listener]);

        expect(
            localStorage.getItem('executionPublicationIds_default'),
        ).toContain(envelope.outboxId);
        expect(dispatchExecutionPublication(envelope, () => [listener])).toBe(
            false,
        );
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('persists an unmatched publication until its consumer subscribes', async () => {
        const listener = vi.fn();
        const envelope = {
            outboxId: 'f7bd476f-5220-4ab9-a60e-95e9a775f26d',
            socketEvent: 'assistantResponse',
            payload: { assistantId: 4, message: { id: 8 } },
        };

        expect(dispatchExecutionPublication(envelope)).toBe(true);
        expect(
            localStorage.getItem('pendingExecutionPublications_default'),
        ).toContain(envelope.outboxId);

        const unsubscribe = subscribeExecutionPublication(
            'assistantResponse',
            listener,
        );
        await Promise.resolve();

        expect(listener).toHaveBeenCalledWith(envelope.payload);
        expect(
            localStorage.getItem('pendingExecutionPublications_default'),
        ).toBe('[]');
        expect(dispatchExecutionPublication(envelope)).toBe(false);
        unsubscribe();
    });
});
