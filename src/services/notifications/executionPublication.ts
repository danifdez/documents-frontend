import { workspaceKey } from '../workspaceScope';

export interface ExecutionPublicationEnvelope {
    outboxId: string;
    socketEvent: string;
    payload: Record<string, unknown>;
}

type PublicationListener = (payload: Record<string, unknown>) => void;

const MAX_SEEN_PUBLICATIONS = 1000;
const MAX_PENDING_PUBLICATIONS = 100;
const SEEN_STORAGE_KEY = 'executionPublicationIds';
const PENDING_STORAGE_KEY = 'pendingExecutionPublications';

interface PublicationState {
    seen: Set<string>;
    seenOrder: string[];
    pending: ExecutionPublicationEnvelope[];
}

const states = new Map<string, PublicationState>();
const listeners = new Map<string, Set<PublicationListener>>();

function readArray(key: string): unknown[] {
    try {
        const value = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(value) ? value : [];
    } catch {
        localStorage.removeItem(key);
        return [];
    }
}

function isEnvelope(value: unknown): value is ExecutionPublicationEnvelope {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<ExecutionPublicationEnvelope>;
    return Boolean(
        candidate.outboxId &&
        candidate.socketEvent &&
        candidate.socketEvent !== 'execution:publication' &&
        candidate.payload &&
        typeof candidate.payload === 'object',
    );
}

function getState(): PublicationState {
    const key = workspaceKey(SEEN_STORAGE_KEY);
    const current = states.get(key);
    if (current) return current;

    const seenOrder = readArray(key)
        .filter((id): id is string => typeof id === 'string')
        .slice(-MAX_SEEN_PUBLICATIONS);
    const pending = readArray(workspaceKey(PENDING_STORAGE_KEY))
        .filter(isEnvelope)
        .slice(-MAX_PENDING_PUBLICATIONS);
    const state = { seen: new Set(seenOrder), seenOrder, pending };
    states.set(key, state);
    return state;
}

function persist(state: PublicationState): void {
    localStorage.setItem(
        workspaceKey(SEEN_STORAGE_KEY),
        JSON.stringify(state.seenOrder),
    );
    localStorage.setItem(
        workspaceKey(PENDING_STORAGE_KEY),
        JSON.stringify(state.pending),
    );
}

function markDelivered(
    state: PublicationState,
    envelope: ExecutionPublicationEnvelope,
): void {
    state.pending = state.pending.filter(
        (item) => item.outboxId !== envelope.outboxId,
    );
    state.seen.add(envelope.outboxId);
    state.seenOrder.push(envelope.outboxId);
    if (state.seenOrder.length > MAX_SEEN_PUBLICATIONS) {
        const oldest = state.seenOrder.shift();
        if (oldest) state.seen.delete(oldest);
    }
    persist(state);
}

function notify(
    handlers: Iterable<PublicationListener>,
    payload: Record<string, unknown>,
): void {
    for (const handler of handlers) {
        try {
            handler(payload);
        } catch (error) {
            console.error('[execution publication] listener failed', error);
        }
    }
}

export function dispatchExecutionPublication(
    envelope: ExecutionPublicationEnvelope,
    listenersFor: (event: string) => PublicationListener[] = (event) =>
        Array.from(listeners.get(event) ?? []),
): boolean {
    if (!isEnvelope(envelope)) return false;
    const state = getState();
    if (
        state.seen.has(envelope.outboxId) ||
        state.pending.some((item) => item.outboxId === envelope.outboxId)
    ) {
        return false;
    }

    const handlers = listenersFor(envelope.socketEvent);
    if (handlers.length === 0) {
        state.pending.push(envelope);
        state.pending = state.pending.slice(-MAX_PENDING_PUBLICATIONS);
        persist(state);
        return true;
    }

    markDelivered(state, envelope);
    notify(handlers, envelope.payload);
    return true;
}

export function isExecutionPublicationKnown(outboxId: string): boolean {
    const state = getState();
    return (
        state.seen.has(outboxId) ||
        state.pending.some((item) => item.outboxId === outboxId)
    );
}

export function subscribeExecutionPublication<
    T extends Record<string, unknown>,
>(event: string, listener: (payload: T) => void): () => void {
    const handler = listener as PublicationListener;
    const eventListeners = listeners.get(event) ?? new Set();
    eventListeners.add(handler);
    listeners.set(event, eventListeners);

    queueMicrotask(() => {
        if (!eventListeners.has(handler)) return;
        const state = getState();
        const pending = state.pending.filter(
            (item) => item.socketEvent === event,
        );
        for (const envelope of pending) {
            markDelivered(state, envelope);
            notify([handler], envelope.payload);
        }
    });

    return () => {
        eventListeners.delete(handler);
        if (eventListeners.size === 0) listeners.delete(event);
    };
}

export function resetExecutionPublicationDeduplication(): void {
    states.clear();
    listeners.clear();
    localStorage.removeItem(workspaceKey(SEEN_STORAGE_KEY));
    localStorage.removeItem(workspaceKey(PENDING_STORAGE_KEY));
}
