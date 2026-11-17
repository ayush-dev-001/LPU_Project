const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  doc: ["application/msword"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xls: ["application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  csv: ["text/csv", "application/csv"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

export function validateDocumentFile(name: string, mimeType: string, size: number) {
  if (size === 0) return "Choose a non-empty file.";
  if (size > MAX_FILE_SIZE) return "The file must be 10 MB or smaller.";
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const acceptedMimeTypes = allowedTypes[extension];
  if (!acceptedMimeTypes || !acceptedMimeTypes.includes(mimeType.toLowerCase())) {
    return "This file type is not allowed, or its MIME type does not match the file extension.";
  }
  return null;
}
