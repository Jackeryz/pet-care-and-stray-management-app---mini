import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl, getAuthToken, useAuth } from './useAuth';

let socketInstance: Socket | null = null;

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || socketInstance) return;

    const baseUrl = getApiBaseUrl();
    const token = getAuthToken();

    // Create socket connection
    const socket = io(baseUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // Join user's notification room
      socket.emit('join-user-room', user.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socketRef.current = socket;
    socketInstance = socket;

    return () => {
      // Don't disconnect on unmount - keep connection alive
      // socket.disconnect();
    };
  }, [user]);

  return socketRef.current;
}

export function useAdoptionChat(adoptionRecordId: number | null) {
  const socket = useSocket();

  const joinChat = useCallback(
    (userId: string) => {
      if (socket && adoptionRecordId) {
        socket.emit('join-adoption-chat', adoptionRecordId, userId);
      }
    },
    [socket, adoptionRecordId]
  );

  const leaveChat = useCallback(() => {
    if (socket && adoptionRecordId) {
      socket.emit('leave-adoption-chat', adoptionRecordId);
    }
  }, [socket, adoptionRecordId]);

  const sendMessage = useCallback(
    (senderId: string, message: string) => {
      if (socket && adoptionRecordId) {
        socket.emit('send-message', {
          adoptionRecordId,
          senderId,
          message,
        });
      }
    },
    [socket, adoptionRecordId]
  );

  const onNewMessage = useCallback(
    (callback: (message: any) => void) => {
      if (socket) {
        socket.off('new-message');
        socket.on('new-message', callback);
      }
    },
    [socket]
  );

  const onUserJoined = useCallback(
    (callback: (data: any) => void) => {
      if (socket) {
        socket.off('user-joined');
        socket.on('user-joined', callback);
      }
    },
    [socket]
  );

  return {
    joinChat,
    leaveChat,
    sendMessage,
    onNewMessage,
    onUserJoined,
  };
}

export function useAdoptionRequestNotifications() {
  const socket = useSocket();

  const onAdoptionRequestReceived = useCallback(
    (callback: (data: any) => void) => {
      if (socket) {
        socket.off('adoption-request-received');
        socket.on('adoption-request-received', callback);
      }
    },
    [socket]
  );

  return {
    onAdoptionRequestReceived,
  };
}
