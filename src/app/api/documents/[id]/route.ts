import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { readFile } from "@/app/(app)/projects/[id]/documents/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const document = await db.document.findFirst({
    where: { id, project: { is: visibleProjectsWhere(user) } },
    select: { name: true, mimeType: true, storageKey: true },
  });
  if (!document) return new Response("Not found", { status: 404 });

  let contents: ReadableStream<Uint8Array>;
  try {
    contents = await readFile(document.storageKey);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
  const safeName = document.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "download";
  const headers = new Headers({
    "Content-Type": document.mimeType,
    "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.name)}`,
    "X-Content-Type-Options": "nosniff",
  });
  return new Response(contents, { headers });
}
