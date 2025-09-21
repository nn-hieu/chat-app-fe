import type { ApiResponse, FriendRequest } from "../types/type";
import api from "./api.service";

export const friendRequestAPI = {
  sendFriendRequest: (receiverId: number) =>
    api.post<ApiResponse<FriendRequest>>('/friend-requests', null, {
      params: { receiverId }
    }),

  respondToFriendRequest: (id: number, isAccepted: boolean | null) =>
    api.patch<ApiResponse<FriendRequest>>('/friend-requests', null, {
      params: { id, isAccepted }
    }),

  getSentRequests: () => api.get<ApiResponse<FriendRequest[]>>('/friend-requests/sent'),

  getReceivedRequests: () => api.get<ApiResponse<FriendRequest[]>>('/friend-requests/received'),
};