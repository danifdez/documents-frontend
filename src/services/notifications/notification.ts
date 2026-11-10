import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from '../apiBase';
import { setServerReachable } from '../offline/offlineInterceptor';
import { getAccessToken } from '../workspaceScope';
import {
    dispatchExecutionPublication,
    ExecutionPublicationEnvelope,
    isExecutionPublicationKnown,
} from './executionPublication';

type SocketEventListener = (...args: any[]) => void;

let connectErrorLogged = false;

const SOCKET_OPTIONS = {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    timeout: 5000,
};

// Listeners registered through `onSocketEvent`. They live outside any single
// Socket instance so they can be re-attached whenever the socket is rebuilt
// (login, workspace switch, local server restart). Binding them directly to the
// current instance — as `useCalendarAlarms`/`useTaskReminders` used to do — makes
// them silently disappear after a reconnect.
const eventListeners = new Map<string, Set<SocketEventListener>>();

function bindConnectionEvents(s: Socket) {
    s.on('connect', () => {
        connectErrorLogged = false;
        setServerReachable(true);
    });
    s.on('connect_error', () => {
        if (!connectErrorLogged) {
            console.warn('[socket] connect failed — will retry silently');
            connectErrorLogged = true;
        }
    });
    s.on(
        'execution:publication',
        (
            envelope: ExecutionPublicationEnvelope,
            acknowledge?: (response: { accepted: boolean }) => void,
        ) => {
            const accepted =
                dispatchExecutionPublication(envelope) ||
                isExecutionPublicationKnown(envelope?.outboxId);
            acknowledge?.({ accepted });
        },
    );
}

let socket: Socket | null = null;

function createSocket(url?: string): Socket {
    const created = io(url || getApiBaseUrl(), {
        auth: { token: getAccessToken() },
        autoConnect: false,
        ...SOCKET_OPTIONS,
    });
    bindConnectionEvents(created);
    for (const [event, listeners] of eventListeners) {
        for (const listener of listeners) created.on(event, listener);
    }
    return created;
}

function getOrCreateSocket(url?: string): Socket {
    if (socket) return socket;
    socket = createSocket(url);
    return socket;
}

export function connectSocket(url?: string) {
    const s = getOrCreateSocket(url);
    if (!s.connected) {
        s.auth = { token: getAccessToken() };
        s.connect();
    }
}

export function reconnectSocket(url?: string) {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    socket = createSocket(url);
    socket.connect();
}

export function getSocket(): Socket {
    return getOrCreateSocket();
}

/**
 * Subscribes to a backend socket event and keeps the subscription alive across
 * socket rebuilds. Returns an unsubscribe function.
 */
export function onSocketEvent(
    event: string,
    listener: SocketEventListener,
): () => void {
    const listeners = eventListeners.get(event) ?? new Set<SocketEventListener>();
    listeners.add(listener);
    eventListeners.set(event, listeners);
    socket?.on(event, listener);

    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) eventListeners.delete(event);
        socket?.off(event, listener);
    };
}
