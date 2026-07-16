import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { selectCurrentUser, selectIsAuthenticated, selectCurrentRole } from '../store/slices/authSlice';
import { selectCurrentBranch } from '../store/slices/branchSlice';
import { notificationApi } from '../store/api/notificationApi';

let socket = null;

export const useNotificationSocket = () => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectCurrentRole);
  const user = useSelector(selectCurrentUser);
  const currentBranch = useSelector(selectCurrentBranch);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        socket = null;
        if (import.meta.env.DEV) {
          console.log('🔌 Disconnected and cleared socket connection on logout');
        }
      }
      return;
    }

    // Connect to WebSocket server if not already connected
    if (!socket) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api/v1';
      const socketUrl = apiBaseUrl.replace('/api/v1', '');

      socket = io(socketUrl, {
        withCredentials: true,
      });

      socket.on('connect', () => {
        if (import.meta.env.DEV) {
          console.log('📡 Connected to WebSockets server');
        }
        joinAppropriateRooms();
      });

      socket.on('new_notification', (notification) => {
        if (import.meta.env.DEV) {
          console.log('🔔 New notification received via socket:', notification);
        }
        // Invalidate RTK query cache to trigger refetch and update UI badges/feeds
        dispatch(notificationApi.util.invalidateTags(['Notification']));
      });

      socket.on('disconnect', () => {
        if (import.meta.env.DEV) {
          console.log('🔌 Disconnected from WebSockets server');
        }
      });
    } else if (socket.connected) {
      // If already connected, join rooms when branch/user context changes
      joinAppropriateRooms();
    }

    function joinAppropriateRooms() {
      if (!socket) return;

      if (role === 'super_admin') {
        if (currentBranch?._id) {
          // If super admin has selected a specific branch view, join that branch room
          socket.emit('join_branch', currentBranch._id);
        } else {
          // Join the super admin stream to receive all branch notifications
          socket.emit('join_super_admin');
        }
      } else {
        // Regular branch user
        const branchId = user?.branchId || user?._id;
        if (branchId) {
          socket.emit('join_branch', branchId);
        }
      }
    }

  }, [isAuthenticated, role, user, currentBranch, dispatch]);
};
