import { timingSafeEqual } from "node:crypto";
import { runAlerts } from "@/app/(app)/notifications/alerts";

/** Daily job (see vercel.json). Requires `Authorization: Bearer <CRON_SECRET>`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  const ok =
    Boolean(secret) &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const created = await runAlerts();
  return Response.json({ created });
}
