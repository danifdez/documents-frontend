import { io } from 'socket.io-client';

const socket = io('http://nestjs-app:3000'); // replace with your NestJS backend URL

export default socket;