import type { ApiResponse, Conversation } from "../types/type"
import api from "./api.service"

export const conversationsAPI = {
  getOrCreateSingleConversation: (friendId: number) =>
    api.post<ApiResponse<Conversation>>(`/conversations/single`, null, {
      params: { friendId }
    }),

  markConversationAsRead: (id: number) =>
    api.patch<ApiResponse<void>>(`/conversations/${id}`),

  getAllConversationsOfUser: () =>
    api.get<ApiResponse<Conversation[]>>('/conversations'),
}