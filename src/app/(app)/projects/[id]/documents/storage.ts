import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile as fsReadFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Where uploaded files live: local disk under ./uploads (gitignored).
 *
 * To deploy to Vercel (read-only, short-lived filesystem), replace this one file with a
 * Vercel Blob version that keeps the same three functions: saveFile, readFile, removeFile.
 * Nothing else in the app touches the disk.
 */

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

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

/** Saves the bytes and returns the storage key (path relative to ./uploads). */
export async function saveFile(projectId: string, fileName: string, data: Buffer) {
  const safeProject = sanitizeFileName(projectId);
  const storageKey = `${safeProject}/${randomUUID()}-${sanitizeFileName(fileName)}`;
  const full = resolveKey(storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, data);
  return storageKey;
}

export async function readFile(storageKey: string) {
  return fsReadFile(resolveKey(storageKey));
}

/** Deletes the file. A file that is already gone is not an error. */
export async function removeFile(storageKey: string) {
  await rm(resolveKey(storageKey), { force: true });
}
