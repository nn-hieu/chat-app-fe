import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { User, UserOnlineStatus } from '../types/type';
import { userAPI } from '../services/user.service';

interface FriendsState {
  friends: User[];
  loading: boolean;
  error: string | null;
  lastLoadedUserId: number | null;
  
  // Actions
  loadFriends: (userId: number) => Promise<void>;
  updateFriendOnlineStatus: (userOnlineStatus: UserOnlineStatus) => void;
  clearFriends: () => void;
}

const useFriendsStore = create<FriendsState>()(
  subscribeWithSelector((set, get) => ({
    friends: [],
    loading: false,
    error: null,
    lastLoadedUserId: null,

    loadFriends: async (userId: number) => {
      const { lastLoadedUserId, loading } = get();
      
      // Allow reloading if userId is different or if it's been a while
      if (lastLoadedUserId === userId && loading) {
        return;
      }

      set({ loading: true, error: null });

      try {
        const response = await userAPI.getFriends(userId);
        set({
          friends: response.data.data || [],
          lastLoadedUserId: userId,
          error: null,
        });
      } catch (error) {
        set({
          error: 'Failed to load friends list',
        });
      } finally {
        set({
          loading: false
        });
      }
    },

    updateFriendOnlineStatus: (userOnlineStatus: UserOnlineStatus) => {
      set((state) => ({
        friends: state.friends.map((friend) =>
          friend.id === userOnlineStatus.userId
            ? {
                ...friend,
                isOnline: userOnlineStatus.isOnline,
              }
            : friend
        ),
      }));
    },

    clearFriends: () => {
      set({
        friends: [],
        loading: false,
        error: null,
        lastLoadedUserId: null,
      });
    },
  }))
);

export default useFriendsStore;