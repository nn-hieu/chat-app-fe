export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: number;
  senderId: number;
  senderUsername: string;
  senderFullName: string;
  conversationId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  readAt: string;
  attachments: Attachment[];
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
}

export interface FriendRequest {
  id: number;
  senderId: number;
  senderUsername: string;
  senderAvatar: string;
  receiverId: number;
  receiverUsername: string;
  receiverAvatar: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  respondedAt?: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  error: string;
  message: string;
  timestamp: string;
}

export interface UserOnlineStatus {
  userId: number;
  isOnline: boolean;
}

export interface TypingStatus {
  senderId: number;
  conversationId: number;
  isTyping: boolean;
}

export interface TypingRequest {
  conversationId: number;
  isTyping: boolean;
}

export interface UserUpdateRequest {
  email: string;
  firstName: string;
  lastName: string;
}

export interface Conversation {
  id: number;
  type: string;
  name: string;
  participants: User[];
  createdBy: User;
  lastMessage: string;
  lastSenderId: number;
  lastMessageTime: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: number;
  url: string;
  publicId: string;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "TEXT" | "APPLICATION" | "MULTIPART" | "OTHER";
  originalFilename: string;
  size: number;
  format: string;
  createdAt: string;
}

export interface UploadedFileInfo {
  uid: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file: File;
}