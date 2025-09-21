import type { ApiResponse, Message, SendMessageRequest } from "../types/type";
import api from "./api.service";

export const messageAPI = {
  findMessagesOfConversation: (id: number, page = 0, size = 20) =>
    api.get<ApiResponse<Message[]>>(`/conversations/${id}/messages`, {
      params: { page, size }
    }),

  sendMessage: (request: SendMessageRequest, files: File[]) => {
    const formData = new FormData();

    formData.append(
      "request",
      new Blob([JSON.stringify(request)], { type: "application/json" })
    );

    files.forEach((file) => {
      formData.append("files", file);
    });

    return api.post<ApiResponse<void>>("/chat/send", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
};