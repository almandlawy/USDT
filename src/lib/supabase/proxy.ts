import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return response;

  let nextResponse = response;
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        const preservedHeaders = new Headers(nextResponse.headers);
        nextResponse = NextResponse.next({ request: { headers: request.headers } });
        preservedHeaders.forEach((value, key) => nextResponse.headers.set(key, value));
        cookiesToSet.forEach(({ name, value, options }) => nextResponse.cookies.set(name, value, { ...options, secure: process.env.NODE_ENV === "production", sameSite: "lax" }));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const locale = pathname.split("/")[1] === "en" ? "en" : "ar";
  const protectedPath = pathname.includes("/dashboard") || pathname.includes("/admin");

  if (protectedPath && !data?.claims) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return nextResponse;
}
