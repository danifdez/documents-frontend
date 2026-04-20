import { io, Socket } from 'socket.io-client';
import { ref, readonly } from 'vue';
import { setServerReachable } from '../offline/offlineInterceptor';

function getAuthToken(): string | null {
    const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
    return localStorage.getItem(`accessToken_${wsId}`);
}

const isConnected = ref(false);
let connectErrorLogged = false;

const SOCKET_OPTIONS = {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 30000,
    timeout: 5000,
};

function bindConnectionEvents(s: Socket) {
    s.on('connect', () => {
        isConnected.value = true;
        connectErrorLogged = false;
        setServerReachable(true);
    });
    s.on('disconnect', () => {
        isConnected.value = false;
    });
    s.on('connect_error', () => {
        if (!connectErrorLogged) {
            console.warn('[socket] connect failed — will retry silently');
            connectErrorLogged = true;
        }
    });
}

let socket: Socket | null = null;

function getOrCreateSocket(url?: string): Socket {
    if (socket) return socket;
    socket = io(url || import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token: getAuthToken() },
        autoConnect: false,
        ...SOCKET_OPTIONS,
    });
    bindConnectionEvents(socket);
    return socket;
}

export function connectSocket(url?: string) {
    const s = getOrCreateSocket(url);
    if (!s.connected) {
        s.auth = { token: getAuthToken() };
        s.connect();
    }
}

export function reconnectSocket(url?: string) {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    socket = io(url || import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token: getAuthToken() },
        ...SOCKET_OPTIONS,
    });
    bindConnectionEvents(socket);
    socket.connect();
}

export function getSocket(): Socket {
    return getOrCreateSocket();
}

export const socketConnected = readonly(isConnected);
