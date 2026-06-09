import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session;
  const isLoginPage = nextUrl.pathname === "/login";
  const isAdminPage = nextUrl.pathname.startsWith("/admin");
  const isApiAuth = nextUrl.pathname.startsWith("/api/auth");
  const isWebhook = nextUrl.pathname.startsWith("/api/webhooks");

  // Allow auth routes and webhooks
  if (isApiAuth || isWebhook) return NextResponse.next();

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/inbox", nextUrl));
  }

  // Protect admin routes — only SUPERADMIN
  if (isAdminPage && session?.user && (session.user as any).role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/inbox", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
