import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/ar/dashboard";
  const [path, query = ""] = value.split("?");
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    return "/ar/dashboard";
  }
  // Only allow known app route prefixes.
  if (!/^\/(ar|en)(\/|$)/.test(path)) return "/ar/dashboard";
  return query ? `${path}?${query}` : path;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const origin = request.nextUrl.origin;
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  const locale = next.startsWith("/en/") ? "en" : "ar";
  return NextResponse.redirect(new URL(`/${locale}/login?error=invalid_callback`, origin));
}
