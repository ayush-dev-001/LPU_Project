import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decrypt } from "@/lib/session";

// Optimistic check only: bounces signed-out visitors to /login before the page renders.
// Real authorization happens in pages and server actions via requireUser()/getProjectAccess().
const PUBLIC_PATHS = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic && !session) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  if (isPublic && session) {
    return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Skip API routes, Next.js internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
