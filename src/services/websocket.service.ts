import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import type { Message, SendMessageRequest, TypingRequest, TypingStatus, UserOnlineStatus } from '../types/type';
import { BASE_URL } from './api.service';
import { notification } from "antd";

class WebSocketService {
  private stompClient: Client | null = null;
  private isConnected = false;
  private currentUserId: string | null = null;
  private connectionPromise: Promise<void> | null = null;

  // Separate callback arrays for different types of data
  private messageCallbacks: ((message: Message) => void)[] = [];
  private errorCallbacks: ((error: string) => void)[] = [];
  private userOnlineCallbacks: ((status: UserOnlineStatus) => void)[] = [];
  private typingCallbacks: ((status: TypingStatus) => void)[] = [];
  private friendRequestCallbacks: ((data: any) => void)[] = [];

  connect(token: string, userId: string): Promise<void> {
    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Return resolved promise if already connected to same user
    if (this.isConnected && this.currentUserId === userId) {
      return Promise.resolve();
    }

    // Disconnect if connected to different user
    if (this.isConnected && this.currentUserId !== userId) {
      this.disconnect();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.currentUserId = userId;

        // Create new Client instance with webSocketFactory
        this.stompClient = new Client({
          webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
          connectHeaders: {
            Authorization: `Bearer ${token}`
          },
          debug: () => { },
          reconnectDelay: 5000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            this.isConnected = true;
            this.subscribeToAllChannels();
            this.connectionPromise = null;
            resolve();
          },
          onStompError: (frame) => {
            console.error('STOMP error:', frame);
            this.isConnected = false;
            this.connectionPromise = null;
            reject(new Error(`STOMP error: ${frame.headers.message}`));
          },
          onWebSocketError: (error) => {
            console.error('WebSocket error:', error);
            this.isConnected = false;
            this.connectionPromise = null;
            reject(error);
          },
          onDisconnect: () => {
            console.log('STOMP disconnected');
            this.isConnected = false;
          }
        });

        // Activate the client
        this.stompClient.activate();

      } catch (error) {
        console.error('WebSocket setup error:', error);
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private subscribeToAllChannels() {
    if (!this.stompClient || !this.isConnected || !this.currentUserId) return;

    try {
      // Subscribe to private message queue
      this.stompClient.subscribe(`/user/${this.currentUserId}/queue/messages`, (message) => {
        try {
          const messageData: Message = JSON.parse(message.body);
          this.messageCallbacks.forEach(callback => {
            try {
              callback(messageData);
            } catch (callbackError) {
              console.error('Error in message callback:', callbackError);
            }
          });
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      // Subscribe to user online status updates (public topic)
      this.stompClient.subscribe('/topic/user.onlineStatus', (message) => {
        try {
          const statusData: UserOnlineStatus = JSON.parse(message.body);
          this.userOnlineCallbacks.forEach(callback => {
            try {
              callback(statusData);
            } catch (callbackError) {
              console.error('Error in user online callback:', callbackError);
            }
          });
        } catch (error) {
          console.error('Error parsing user online status:', error);
        }
      });

      // Subscribe to typing status updates
      this.stompClient.subscribe(`/user/${this.currentUserId}/queue/typing`, (message) => {
        try {
          const typingData: TypingStatus = JSON.parse(message.body);
          this.typingCallbacks.forEach(callback => {
            try {
              callback(typingData);
            } catch (callbackError) {
              console.error('Error in typing callback:', callbackError);
            }
          });
        } catch (error) {
          console.error('Error parsing typing status:', error);
        }
      });

      // Subscribe to friend requests
      this.stompClient.subscribe(`/user/${this.currentUserId}/queue/friend-requests`, (message) => {
        try {
          const requestData = JSON.parse(message.body);
          this.friendRequestCallbacks.forEach(callback => {
            try {
              callback(requestData);
            } catch (callbackError) {
              console.error('Error in friend request callback:', callbackError);
            }
          });
        } catch (error) {
          console.error('Error parsing friend request:', error);
        }
      });

      this.stompClient.subscribe(`/user/${this.currentUserId}/queue/errors`, (message) => {
        try {
          const requestData = message.body;
          notification.error({
            message: requestData
          });
        } catch (error) {
          console.error('Error parsing friend request:', error);
        }
      });
    } catch (error) {
      console.error('Error subscribing to WebSocket channels:', error);
    }
  }

  sendMessage(request: SendMessageRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.stompClient || !this.isConnected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      try {
        this.stompClient.publish({
          destination: '/app/chat.sendMessage',
          body: JSON.stringify(request)
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  sendTypingStatus(status: TypingRequest) {
    try {
      this.publishTyping(status);
    } catch (error) {
      console.error('Error sending typing status:', error);
    }
  }

  private publishTyping(status: TypingRequest) {
    if (!this.stompClient || !this.isConnected) {
      return;
    }

    this.stompClient.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify(status),
    });
  }

  // Message callbacks
  onMessage(callback: (message: Message) => void): () => void {
    this.messageCallbacks.push(callback);
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index > -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  // Error callbacks
  onError(callback: (error: string) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  // User online status callbacks
  onUserOnlineStatus(callback: (status: UserOnlineStatus) => void): () => void {
    this.userOnlineCallbacks.push(callback);
    return () => {
      const index = this.userOnlineCallbacks.indexOf(callback);
      if (index > -1) {
        this.userOnlineCallbacks.splice(index, 1);
      }
    };
  }

  // Typing status callbacks
  onTypingStatus(callback: (status: TypingStatus) => void): () => void {
    this.typingCallbacks.push(callback);
    return () => {
      const index = this.typingCallbacks.indexOf(callback);
      if (index > -1) {
        this.typingCallbacks.splice(index, 1);
      }
    };
  }

  // Friend request callbacks
  onFriendRequest(callback: (data: any) => void): () => void {
    this.friendRequestCallbacks.push(callback);
    return () => {
      const index = this.friendRequestCallbacks.indexOf(callback);
      if (index > -1) {
        this.friendRequestCallbacks.splice(index, 1);
      }
    };
  }

  disconnect() {
    if (this.stompClient) {
      try {
        this.stompClient.deactivate();
      } catch (error) {
        console.error('Error disconnecting WebSocket:', error);
      }
    }

    this.isConnected = false;
    this.currentUserId = null;
    this.stompClient = null;
    this.connectionPromise = null;

    // Clear all callbacks
    this.messageCallbacks = [];
    this.errorCallbacks = [];
    this.userOnlineCallbacks = [];
    this.typingCallbacks = [];
    this.friendRequestCallbacks = [];
  }

  isConnectedState(): boolean {
    return this.isConnected;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;