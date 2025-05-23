import { io } from 'socket.io-client';

const socket = io('http://backend:3000'); // replace with your NestJS backend URL

export default socket;