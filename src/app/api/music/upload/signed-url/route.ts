import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// POST /api/music/upload/signed-url
// Generate a short-lived signed URL for a track (admin or authenticated user)
// Body: { path: string } - storage path
// Returns: { url: string, expires_at: string, expiresIn: number }
export async function POST(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    const hasBirthday = await readScope("birthday");

    if (!user && !hasBirthday) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const rawPath = typeof body?.path === "string" ? body.path.trim() : "";

    if (!rawPath) {
      return NextResponse.json({ error: "Storage path is required." }, { status: 400 });
    }

    // Only allow paths under audio/ prefix, disallow path traversal
    const normalizedPath = rawPath.replace(/\\/g, "/");
    if (!normalizedPath.startsWith("audio/") || normalizedPath.includes("..")) {
      return NextResponse.json(
        { error: "Invalid path: must begin with 'audio/' and cannot contain '..'." },
        { status: 400 }
      );
    }

    const adminDb = getAdminClient();
    const expiresIn = 3600; // 60 minutes in seconds

    // Create signed URL on birthday-audio bucket
    let { data, error } = await adminDb.storage
      .from("birthday-audio")
      .createSignedUrl(normalizedPath, expiresIn);

    // Graceful fallback to birthday-public if track was stored there previously
    if (error || !data?.signedUrl) {
      const fallback = await adminDb.storage
        .from("birthday-public")
        .createSignedUrl(normalizedPath, expiresIn);
      if (fallback.data?.signedUrl) {
        data = fallback.data;
        error = null;
      }
    }

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: `Could not generate signed URL: ${error?.message || "File not found"}` },
        { status: 404 }
      );
    }

    const expires_at = new Date(Date.now() + expiresIn * 1000).toISOString();

    return NextResponse.json({
      url: data.signedUrl,
      expires_at,
      expiresIn,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate signed URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
