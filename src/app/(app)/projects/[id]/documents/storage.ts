import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile as fsReadFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobNotFoundError, del, get, put } from "@vercel/blob";

/*
 * Where uploaded files live.
 *
 * - When BLOB_READ_WRITE_TOKEN is set (Vercel, after connecting a Blob store), files go to a
 *   PRIVATE Vercel Blob store. Their keys start with "blob:". Nobody gets a Blob URL: every
 *   download still goes through /api/documents/[id], which checks project access first.
 * - Otherwise (local development), files go to ./uploads on disk (gitignored).
 *
 * Nothing else in the app touches storage; keep these three functions: saveFile, readFile, removeFile.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const BLOB_PREFIX = "blob:";

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** Keep letters, digits, dot, underscore and dash; everything else becomes "_". Max 100 chars. */
export function sanitizeFileName(name: string) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "_").slice(0, 100);
  return cleaned || "file";
}

/** Resolve a storage key to an absolute path, refusing anything that escapes ./uploads. */
function resolveKey(storageKey: string) {
  const full = path.resolve(UPLOAD_ROOT, storageKey);
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Invalid storage key.");
  return full;
}

/** The Blob pathname inside a "blob:" key, or null for a local-disk key. */
function blobPathname(storageKey: string) {
  return storageKey.startsWith(BLOB_PREFIX) ? storageKey.slice(BLOB_PREFIX.length) : null;
}

/** Saves the bytes and returns the storage key. */
export async function saveFile(projectId: string, fileName: string, data: Buffer) {
  const relative = `${sanitizeFileName(projectId)}/${randomUUID()}-${sanitizeFileName(fileName)}`;

  if (blobEnabled()) {
    const blob = await put(`documents/${relative}`, data, { access: "private", addRandomSuffix: false });
    return `${BLOB_PREFIX}${blob.pathname}`;
  }

  const full = resolveKey(relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return relative;
}

/** Returns the file's bytes. Throws if it no longer exists. */
export async function readFile(storageKey: string) {
  const pathname = blobPathname(storageKey);
  if (pathname === null) return fsReadFile(resolveKey(storageKey));

  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200) throw new Error("File not found.");
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

/** Deletes the file. A file that is already gone is not an error. */
export async function removeFile(storageKey: string) {
  const pathname = blobPathname(storageKey);
  if (pathname === null) {
    await rm(resolveKey(storageKey), { force: true });
    return;
  }
  try {
    await del(pathname);
  } catch (error) {
    // Match the disk branch: a blob that is already gone is fine; anything else is a real failure.
    if (!(error instanceof BlobNotFoundError)) throw error;
  }
}
