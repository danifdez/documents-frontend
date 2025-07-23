import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000'); // replace with your NestJS backend URL

export default socket;