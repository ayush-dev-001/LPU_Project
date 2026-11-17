/** Allowed upload types: extension → MIME types browsers report for it. Both must match. */
export const ALLOWED_TYPES: Record<string, readonly string[]> = {
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
  // Windows browsers often report CSV as the Excel type.
  csv: ["text/csv", "application/vnd.ms-excel"],
  zip: ["application/zip", "application/x-zip-compressed"],
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** For the file input's accept attribute. */
export const ACCEPT = Object.keys(ALLOWED_TYPES)
  .map((ext) => `.${ext}`)
  .join(",");

export function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** "532 KB", "2.4 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
