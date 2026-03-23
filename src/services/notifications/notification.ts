import { io, Socket } from 'socket.io-client';

let socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

export function reconnectSocket(url: string) {
    socket.disconnect();
    socket = io(url);
    socket.connect();
}

export function getSocket(): Socket {
    return socket;
}

export default socket;
