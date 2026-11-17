import "server-only";

// For Vercel deployment, replace this module with Vercel Blob while keeping this three-function interface.
import { randomUUID } from "node:crypto";
import { mkdir, open, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

function sanitiseName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "upload";
}

function resolveStoragePath(storageKey: string) {
  if (!storageKey || path.isAbsolute(storageKey)) throw new Error("Invalid document storage key.");
  const resolved = path.resolve(uploadsRoot, storageKey);
  const relative = path.relative(uploadsRoot, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Document storage key is outside the uploads directory.");
  }
  return resolved;
}

export async function saveFile(projectId: string, name: string, contents: Uint8Array) {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) throw new Error("Invalid project storage identifier.");
  const storageKey = path.join(projectId, `${randomUUID()}-${sanitiseName(name)}`);
  const filePath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, { flag: "wx" });
  return storageKey;
}

export async function readFile(storageKey: string) {
  const file = await open(resolveStoragePath(storageKey), "r");
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const chunk = Buffer.alloc(64 * 1024);
        const { bytesRead } = await file.read(chunk, 0, chunk.length, null);
        if (bytesRead === 0) {
          await file.close();
          controller.close();
          return;
        }
        controller.enqueue(new Uint8Array(chunk.subarray(0, bytesRead)));
      } catch (error) {
        await file.close();
        controller.error(error);
      }
    },
    async cancel() {
      await file.close();
    },
  });
}

export async function removeFile(storageKey: string) {
  try {
    await rm(resolveStoragePath(storageKey));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
}
