import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl, getAuthToken, useAuth } from './useAuth';

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      // User logged out - disconnect
      if (socketRef.current) {
        console.log('📌 Disconnecting socket - user logged out');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      lastTokenRef.current = null;
      return;
    }

    const token = getAuthToken();
    
    // If token changed (user switched), disconnect old socket and create new one
    if (lastTokenRef.current && lastTokenRef.current !== token) {
      console.log('🔄 Token changed - reconnecting socket for new user');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }

    // Only create a new socket if we don't have one yet
    if (socketRef.current) {
      console.log('✓ Socket already connected:', socketRef.current.id);
      return;
    }

    lastTokenRef.current = token;

    // Create socket connection
    console.log('🔌 Creating new socket connection for user:', user.id);
    const socket = io(window.location.origin, {
      path: '/socket.io/',
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      secure: true,
      rejectUnauthorized: false,
    });

    socket.on('connect', () => {
      console.log('✓ Socket.io connected:', socket.id, 'User:', user.id);
      // Join user's notification room
      socket.emit('join-user-room', user.id);
      console.log(`  Joined room: user-${user.id}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    socket.on('adoption-request-received', (data) => {
      console.log('🔔 [Socket] adoption-request-received event received:', data);
    });

    socketRef.current = socket;

    return () => {
      // Cleanup is handled by the next effect cycle if user changes
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

export function useAdoptionRequestNotifications(
  onAdoptionRequest: (data: any) => void
) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) {
      console.log('❌ No socket available for adoption notifications');
      return;
    }

    console.log('📡 Setting up adoption request notification listener');
    
    const handleAdoptionRequest = (data: any) => {
      console.log('🔔 [Socket] Adoption request received:', data);
      onAdoptionRequest(data);
    };

    socket.on('adoption-request-received', handleAdoptionRequest);

    return () => {
      socket.off('adoption-request-received', handleAdoptionRequest);
    };
  }, [socket, onAdoptionRequest]);
}

export function useStrayReportNotifications() {
  const socket = useSocket();

  const onStrayReportReceived = useCallback(
    (callback: (data: any) => void) => {
      if (socket) {
        socket.off('stray-report-notification');
        socket.on('stray-report-notification', callback);
      }
    },
    [socket]
  );

  return {
    onStrayReportReceived,
  };
}
