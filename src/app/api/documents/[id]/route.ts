import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { visibleProjectsWhere } from "@/lib/permissions";
import { readFile } from "@/app/(app)/projects/[id]/documents/storage";

/** Access-checked download. Users who can't see the project get 404, so they can't tell the file exists. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const doc = await db.document.findFirst({
    where: { id, project: visibleProjectsWhere(user) },
    select: { name: true, mimeType: true, storageKey: true },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(doc.storageKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  // Quote-safe ASCII fallback plus the UTF-8 name for browsers that support it.
  const asciiName = doc.name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
