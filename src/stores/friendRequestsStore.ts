import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { friendRequestAPI } from '../services/friend-request.service';
import { webSocketService } from '../services/websocket.service';
import type { FriendRequest } from '../types/type';

interface FriendRequestsState {
  pendingReceivedCount: number;
  isSocketListening: boolean;
}

interface FriendRequestsActions {
  setPendingReceivedCount: (count: number) => void;
  incrementPendingCount: () => void;
  decrementPendingCount: () => void;
  refreshPendingCount: () => Promise<void>;
  initializeSocketListener: () => () => void;
  cleanupSocketListener: () => void;
}

type FriendRequestsStore = FriendRequestsState & FriendRequestsActions;

export const useFriendRequestsStore = create<FriendRequestsStore>()(
  devtools(
    (set, get) => ({
      // State
      pendingReceivedCount: 0,
      isSocketListening: false,

      // Actions
      setPendingReceivedCount: (count) => {
        set({ pendingReceivedCount: Math.max(0, count) }, false, 'setPendingReceivedCount');
      },

      incrementPendingCount: () => {
        set((state) => ({ 
          pendingReceivedCount: state.pendingReceivedCount + 1 
        }), false, 'incrementPendingCount');
      },

      decrementPendingCount: () => {
        set((state) => ({ 
          pendingReceivedCount: Math.max(0, state.pendingReceivedCount - 1) 
        }), false, 'decrementPendingCount');
      },

      refreshPendingCount: async () => {
        try {
          const response = await friendRequestAPI.getReceivedRequests();
          const receivedRequests = response.data.data || [];
          const pendingCount = receivedRequests.filter((req: FriendRequest) => req.status === 'PENDING').length;
          set({ pendingReceivedCount: pendingCount }, false, 'refreshPendingCount');
        } catch (error) {
          console.error('Error refreshing pending friend requests count:', error);
        }
      },

      initializeSocketListener: () => {
        if (get().isSocketListening) {
          return () => {}; // Already listening, return empty cleanup
        }

        const handleSocketFriendRequest = (friendRequest: FriendRequest) => {
          try {
            const currentUserId = parseInt(webSocketService.getCurrentUserId() || '0');
            
            if (friendRequest.receiverId === currentUserId) {
              // This is a request sent TO current user
              if (friendRequest.status === 'PENDING') {
                // New request received - increment count
                get().incrementPendingCount();
              } else if (friendRequest.status === 'CANCELLED') {
                // Request cancelled - decrement count
                get().decrementPendingCount();
              }
            }
          } catch (error) {
            console.error('Error handling socket friend request in store:', error);
          }
        };

        const unsubscribe = webSocketService.onFriendRequest(handleSocketFriendRequest);
        set({ isSocketListening: true }, false, 'initializeSocketListener');

        // Return cleanup function
        return () => {
          unsubscribe();
          set({ isSocketListening: false }, false, 'cleanupSocketListener');
        };
      },

      cleanupSocketListener: () => {
        set({ isSocketListening: false }, false, 'cleanupSocketListener');
      },
    }),
    {
      name: 'friend-requests-store',
    }
  )
);