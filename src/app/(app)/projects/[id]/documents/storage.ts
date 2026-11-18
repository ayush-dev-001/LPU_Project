import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile as fsReadFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export class StorageFileNotFoundError extends Error {
  constructor() {
    super("Stored file not found.");
    this.name = "StorageFileNotFoundError";
  }
}

/** Keep letters, digits, dot, underscore and dash; everything else becomes "_". Max 100 chars. */
export function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "_").slice(0, 100);
  return cleaned || "file";
}

function storageBackend(): "blob" | "local" {
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasOidcCredentials = Boolean(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID);
  if (hasReadWriteToken || hasOidcCredentials) return "blob";
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Document storage is not configured. Connect a private Vercel Blob store or set BLOB_READ_WRITE_TOKEN.",
    );
  }
  return "local";
}

function validateStorageKey(storageKey: string) {
  const [project, file] = storageKey.split("/");
  if (
    !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(storageKey) ||
    project === "." ||
    project === ".." ||
    file === "." ||
    file === ".."
  ) {
    throw new Error("Invalid storage key.");
  }
}

/** Resolve a local storage key to an absolute path, refusing anything that escapes ./uploads. */
function resolveKey(storageKey: string) {
  validateStorageKey(storageKey);
  const full = path.resolve(UPLOAD_ROOT, storageKey);
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Invalid storage key.");
  return full;
}

/** Saves the bytes and returns the storage key used by the document row. */
export async function saveFile(projectId: string, fileName: string, data: Buffer) {
  const safeProject = sanitizeFileName(projectId);
  const storageKey = `${safeProject}/${randomUUID()}-${sanitizeFileName(fileName)}`;
  if (storageBackend() === "blob") {
    const blob = await put(storageKey, data, { access: "private" });
    return blob.pathname;
  }

  const full = resolveKey(storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return storageKey;
}

export async function readFile(storageKey: string) {
  validateStorageKey(storageKey);
  if (storageBackend() === "blob") {
    const blob = await get(storageKey, { access: "private" });
    if (!blob || blob.statusCode !== 200) throw new StorageFileNotFoundError();
    return Buffer.from(await new Response(blob.stream).arrayBuffer());
  }

  try {
    return await fsReadFile(resolveKey(storageKey));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new StorageFileNotFoundError();
    }
    throw error;
  }
}

/** Deletes the file. A file that is already gone is not an error. */
export async function removeFile(storageKey: string) {
  validateStorageKey(storageKey);
  if (storageBackend() === "blob") {
    await del(storageKey);
    return;
  }
  await rm(resolveKey(storageKey), { force: true });
}
