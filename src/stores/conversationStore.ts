import { create } from 'zustand';
import type { Conversation, Message, User } from '../types/type';
import { conversationsAPI } from '../services/conversation.service';
import { messageAPI } from '../services/message.service';

interface ConversationStore {
  // State
  conversations: Conversation[];
  messages: Record<number, Message[]>;
  draftMessages: Record<number, string>;
  selectedConversationId: number;

  // Pagination state
  messagesPagination: Record<number, {
    currentPage: number;
    hasMore: boolean;
    isLoading: boolean;
  }>;

  // Loading states
  loadingConversations: boolean;
  loadingMessages: Record<number, boolean>;

  // Actions
  loadConversations: () => Promise<void>;
  loadConversationMessages: (conversationId: number, page?: number, size?: number) => Promise<void>;
  loadMoreMessages: (conversationId: number, size?: number) => Promise<void>;

  // Message management
  addMessage: (message: Message) => void;
  updateConversationWithNewMessage: (message: Message) => void;

  // Draft management
  setDraftMessage: (conversationId: number, draft: string) => void;
  clearDraftMessage: (conversationId: number) => void;

  // Conversation management
  setSelectedConversation: (conversationId: number) => void;
  markConversationAsRead: (conversationId: number) => Promise<void>;
  addOrUpdateConversation: (conversation: Conversation) => void;

  // User status updates
  updateParticipantOnlineStatus: (userId: number, isOnline: boolean) => void;

  // Utility
  getConversationById: (conversationId: number) => Conversation | undefined;
  getOtherParticipant: (conversationId: number, currentUserId: number) => User | undefined;
  isConversationLoaded: (conversationId: number) => boolean;
  getConversationPagination: (conversationId: number) => { currentPage: number; hasMore: boolean; isLoading: boolean };

  // Reset store
  resetStore: () => void;
}

// Helper function để khởi tạo pagination state
const getInitialPaginationState = () => ({
  currentPage: -1,
  hasMore: true,
  isLoading: false
});

const initialState = {
  conversations: [],
  messages: {},
  draftMessages: {},
  selectedConversationId: 0,
  messagesPagination: {},
  loadingConversations: false,
  loadingMessages: {},
};

const useConversationStore = create<ConversationStore>((set, get) => ({
  ...initialState,

  // Load all conversations for a user
  loadConversations: async () => {
    set({ loadingConversations: true });

    try {
      const response = await conversationsAPI.getAllConversationsOfUser();
      set({
        conversations: response.data.data,
      });
    } catch (error) {
      throw error;
    } finally {
      set({ loadingConversations: false });
    }
  },

  // Load messages for a specific conversation (initial load or specific page)
  loadConversationMessages: async (conversationId: number, page = 0, size = 20) => {
    // Set loading state với khởi tạo đầy đủ pagination
    set(state => ({
      loadingMessages: {
        ...state.loadingMessages,
        [conversationId]: true
      },
      messagesPagination: {
        ...state.messagesPagination,
        [conversationId]: {
          // Khởi tạo đầy đủ state nếu chưa có, merge với state hiện tại
          ...getInitialPaginationState(),
          ...state.messagesPagination[conversationId],
        }
      }
    }));

    try {
      const response = await messageAPI.findMessagesOfConversation(conversationId, page, size);
      const newMessages = response.data.data;

      set(state => {
        const existingMessages = state.messages[conversationId] || [];
        
        let updatedMessages;
        if (page === 0) {
          // Initial load - replace all messages
          updatedMessages = newMessages;
        } else {
          // Load more - prepend new messages to avoid duplicates
          const existingMessageIds = new Set(existingMessages.map(msg => msg.id));
          const filteredNewMessages = newMessages.filter(msg => !existingMessageIds.has(msg.id));
          updatedMessages = [...filteredNewMessages, ...existingMessages];
        }

        return {
          messages: {
            ...state.messages,
            [conversationId]: updatedMessages
          },
          messagesPagination: {
            ...state.messagesPagination,
            [conversationId]: {
              currentPage: page,
              hasMore: newMessages.length === size, // If we got less than requested, no more messages
              isLoading: false
            }
          },
          loadingMessages: {
            ...state.loadingMessages,
            [conversationId]: false
          }
        };
      });

    } catch (error) {
      console.error('Failed to load messages:', error);
      set(state => ({
        messagesPagination: {
          ...state.messagesPagination,
          [conversationId]: {
            // Đảm bảo có đầy đủ state khi có lỗi
            ...getInitialPaginationState(),
            ...state.messagesPagination[conversationId],
            isLoading: false
          }
        },
        loadingMessages: {
          ...state.loadingMessages,
          [conversationId]: false
        }
      }));
      throw error;
    }
  },

  // Load more messages (for infinite scroll)
  loadMoreMessages: async (conversationId: number, size = 20) => {
    const state = get();
    const pagination = state.messagesPagination[conversationId] || getInitialPaginationState();
    
    // Don't load if already loading or no more messages
    if (pagination.isLoading || !pagination.hasMore) {
      return;
    }

    const nextPage = pagination.currentPage + 1;
    await get().loadConversationMessages(conversationId, nextPage, size);
  },

  // Add a new message to the store
  addMessage: (message: Message) => {
    const conversationId = message.conversationId;

    set(state => ({
      messages: {
        ...state.messages,
        [conversationId]: [
          ...(state.messages[conversationId] || []),
          message
        ]
      }
    }));
  },

  // Update conversation with new message info
  updateConversationWithNewMessage: (message: Message) => {
    set(state => ({
      conversations: state.conversations.map(conv => {
        if (conv.id === message.conversationId) {
          return {
            ...conv,
            lastMessage: message.content,
            lastMessageTime: message.createdAt,
            lastSenderId: message.senderId,
            // Only increment unread count if it's not the selected conversation
            unreadCount: state.selectedConversationId === message.conversationId
              ? 0
              : (conv.unreadCount || 0) + 1
          };
        }
        return conv;
      })
    }));
  },

  // Draft message management
  setDraftMessage: (conversationId: number, draft: string) => {
    set(state => ({
      draftMessages: {
        ...state.draftMessages,
        [conversationId]: draft
      }
    }));
  },

  clearDraftMessage: (conversationId: number) => {
    set(state => {
      const newDrafts = { ...state.draftMessages };
      delete newDrafts[conversationId];
      return { draftMessages: newDrafts };
    });
  },

  // Set selected conversation and mark as read
  setSelectedConversation: (conversationId: number) => {
    set({ selectedConversationId: conversationId });

    // Reset unread count for selected conversation and call API
    if (conversationId) {
      const conversationIdNum = conversationId;

      // Update UI immediately
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      }));

      // Call API asynchronously without waiting
      get().markConversationAsRead(conversationIdNum);
    }
  },

  // Mark conversation as read
  markConversationAsRead: async (conversationId: number) => {
    try {
      await conversationsAPI.markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Failed to mark conversation as read:', error);
      // Optionally revert the UI change if API fails
      set(state => ({
        conversations: state.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, unreadCount: conv.unreadCount || 0 } // Keep existing count if API fails
            : conv
        )
      }));
    }
  },

  // Add or update a conversation
  addOrUpdateConversation: (conversation: Conversation) => {
    set(state => {
      const existingIndex = state.conversations.findIndex(conv => conv.id === conversation.id);

      if (existingIndex >= 0) {
        // Update existing conversation
        const updatedConversations = [...state.conversations];
        updatedConversations[existingIndex] = conversation;
        return { conversations: updatedConversations };
      } else {
        // Add new conversation
        return { conversations: [conversation, ...state.conversations] };
      }
    });
  },

  // Update participant online status
  updateParticipantOnlineStatus: (userId: number, isOnline: boolean) => {
    set(state => ({
      conversations: state.conversations.map(conv => ({
        ...conv,
        participants: conv.participants.map(participant =>
          participant.id === userId
            ? { ...participant, isOnline }
            : participant
        )
      }))
    }));
  },

  // Get conversation by ID
  getConversationById: (conversationId: number) => {
    const { conversations } = get();
    return conversations.find(conv => conv.id === conversationId);
  },

  // Get other participant in a conversation
  getOtherParticipant: (conversationId: number, currentUserId: number) => {
    const conversation = get().getConversationById(conversationId);
    if (!conversation) return undefined;

    return conversation.participants.find(p => p.id !== currentUserId);
  },

  isConversationLoaded: (conversationId: number) => {
    const { messages, messagesPagination } = get();
    return messages.hasOwnProperty(conversationId) && messagesPagination[conversationId]?.currentPage >= 0;
  },

  getConversationPagination: (conversationId: number) => {
    const { messagesPagination } = get();
    return messagesPagination[conversationId] || getInitialPaginationState();
  },

  // Reset entire store
  resetStore: () => {
    set(initialState);
  }
}));

export default useConversationStore;