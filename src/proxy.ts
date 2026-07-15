import { NextResponse, type NextRequest } from "next/server";
import { LOCALES } from "@/lib/constants";
import { updateSession } from "@/lib/supabase/proxy";
import { isSupabaseConfigured } from "@/lib/env";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));

  if (!hasLocale) {
    // Production entrypoint must land on Arabic by default.
    // English remains available explicitly at /en.
    const locale = pathname === "/" ? "ar" : request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : "ar";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const protectedPath = pathname.includes("/dashboard") || pathname.includes("/admin");
  const localDemo = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
  if (protectedPath && !isSupabaseConfigured() && !localDemo) {
    const locale = pathname.split("/")[1] === "en" ? "en" : "ar";
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("error", "configuration");
    return NextResponse.redirect(url);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const developmentScript = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  // Keep first-party Next.js chunks explicitly allowed. `strict-dynamic` makes
  // browsers ignore the `'self'` source and can block chunks loaded by the
  // App Router runtime, leaving users inside Next.js' client error boundary.
  const csp = `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'nonce-${nonce}'${developmentScript}; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self' blob:; upgrade-insecure-requests`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-locale", pathname.split("/")[1] === "en" ? "en" : "ar");
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", crypto.randomUUID());
  response.headers.set("Content-Security-Policy", csp);
  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!api|auth/callback|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
