import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * requireUser() sends users here when their session cookie is validly signed but no longer
 * maps to an active user (account deactivated or deleted). Clearing the cookie stops the
 * proxy from redirecting /login back to the app in a loop.
 *
 * A still-valid session is left alone, so a link to this URL can't sign anyone out.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (user) return NextResponse.redirect(new URL("/dashboard", request.nextUrl));

  const response = NextResponse.redirect(new URL("/login", request.nextUrl));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
