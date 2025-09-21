import api from "./api.service";

export const attachmentAPI = {
  download: (attachmentId: number, config?: any) => 
    api.get<any>(`/attachments/${attachmentId}/download`, {
      ...config,
    }),
};