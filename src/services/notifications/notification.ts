import { io, Socket } from 'socket.io-client';

function getAuthToken(): string | null {
    const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
    return localStorage.getItem(`accessToken_${wsId}`);
}

let socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    auth: { token: getAuthToken() },
});

export function reconnectSocket(url?: string) {
    socket.disconnect();
    socket = io(url || import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token: getAuthToken() },
    });
    socket.connect();
}

export function getSocket(): Socket {
    return socket;
}

export default socket;
