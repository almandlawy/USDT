import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerEnv, isSupabaseConfigured } from "@/lib/env";

const privateBuckets = new Set(["kyc-documents", "payment-proofs", "payment-method-qr"]);

export async function GET(_request: NextRequest, context: { params: Promise<{ bucket: string; path: string[] }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "storage_not_configured" }, { status: 503 });
  const { bucket, path } = await context.params;
  if (!privateBuckets.has(bucket) || !Array.isArray(path) || path.length < 2 || path.some((part) => !part || part === "." || part === "..")) {
    return NextResponse.json({ error: "invalid_file_path" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "authentication_required" }, { status: 401 });

  const objectPath = path.join("/");
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, getServerEnv().SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "file_not_found_or_forbidden" }, { status: 404 });

  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer" },
  });
}
