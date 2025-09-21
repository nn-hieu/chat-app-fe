import type { ApiResponse, User, UserUpdateRequest } from "../types/type";
import api from "./api.service";

export const userAPI = {
  getUserById: (id: number) =>
    api.get<ApiResponse<User>>(`/users/${id}`),

  getFriends: (id: number) =>
    api.get<ApiResponse<User[]>>(`/users/${id}/friends`),

  countFriends: (id: number) =>
    api.get<ApiResponse<Number>>(`/users/${id}/friends/count`),

  getMutualFriends: (id: number, otherUserId: number) =>
    api.get<ApiResponse<User[]>>(`/users/${id}/friends/mutual`, {
      params: { otherUserId }
    }),

  searchUsers: (username: string | null, email: string | null, fullName: string | null) => {
    const params: Record<string, string> = {};

    if (username) params.username = username;
    if (email) params.email = email;
    if (fullName) params.fullName = fullName;

    return api.get<ApiResponse<User[]>>("/users", { params });
  },

  updateProfile: (id: number, request: UserUpdateRequest, avatarFile?: File) => {
    const formData = new FormData();

    formData.append(
      "request",
      new Blob([JSON.stringify(request)], { type: "application/json" })
    );

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    return api.patch<ApiResponse<User>>(`/users/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
};