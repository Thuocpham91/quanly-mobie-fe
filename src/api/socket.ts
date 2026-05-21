import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (token: string): Socket => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:9005', {
    auth: {
      token: `Bearer ${token}`
    },
    transports: ['websocket', 'polling'], // Allow fallback
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected successfully');
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('⚠️ Socket connection error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};
