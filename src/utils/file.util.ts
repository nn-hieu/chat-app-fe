import { fileTypeFromBuffer } from "file-type";
import { attachmentAPI } from "../services/attachment.service";

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const downloadAttachment = async (attachmentId: number) => {
  const response = await attachmentAPI.download(attachmentId, {
    responseType: "blob",
  });

  const blob = new Blob([response.data]);

  const disposition = response.headers["content-disposition"];
  let filename = "download";
  if (disposition && disposition.indexOf("filename=") !== -1) {
    filename = disposition.split("filename=")[1].replace(/"/g, "").trim();
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const EXT_MIME_MAP: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  txt: ["text/plain"]
};

export const getFileType = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  const type = await fileTypeFromBuffer(uint8);

  return type;
}

export const isValid = async (file: File): Promise<boolean> => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (!ext || !EXT_MIME_MAP[ext]) {
    return false;
  }

  const type = await getFileType(file);
  let mime: string | undefined = type?.mime;

  if (!mime && file.type) {
    mime = file.type;
  }

  if (!mime) return false;

  return EXT_MIME_MAP[ext].includes(mime);
};