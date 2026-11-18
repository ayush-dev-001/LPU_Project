import { ALLOWED_TYPES, MAX_UPLOAD_BYTES, extensionOf } from "./file-types";

export function validateDocumentFile(name: string, mimeType: string, size: number) {
  if (size === 0) return "Choose a non-empty file.";
  if (size > MAX_UPLOAD_BYTES) return "The file must be 10 MB or smaller.";
  const acceptedMimeTypes = ALLOWED_TYPES[extensionOf(name)];
  if (!acceptedMimeTypes) {
    return "That file type isn't allowed. Allowed: PDF, images, Word, Excel, PowerPoint, text, CSV and ZIP.";
  }
  if (!acceptedMimeTypes.includes(mimeType.toLowerCase())) {
    return "The file's contents don't match its extension.";
  }
  return null;
}
