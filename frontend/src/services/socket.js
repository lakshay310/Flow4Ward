import { io } from 'socket.io-client';

// VITE_BACKEND_URL is injected by start.js or environment variables
// In production, we connect to the same origin serving the app (monolith).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export default socket;
