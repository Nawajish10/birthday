import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ track_id: string }>;
}

// GET /api/music/lyrics/[track_id] - get lyrics for a track (returns null fields if not available — do NOT 404)
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    const hasBirthday = await readScope("birthday");

    if (!user && !hasBirthday) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { track_id } = await context.params;
    if (!track_id) {
      return NextResponse.json({
        plain_text: null,
        timed_json: null,
        language: "en",
        source_attribution: null,
      });
    }

    const db = user ? sb : getAdminClient();
    const { data } = await db
      .from("music_lyrics")
      .select("plain_text, timed_json, language, source_attribution")
      .eq("track_id", track_id)
      .maybeSingle();

    return NextResponse.json({
      plain_text: data?.plain_text ?? null,
      timed_json: data?.timed_json ?? null,
      language: data?.language ?? "en",
      source_attribution: data?.source_attribution ?? null,
    });
  } catch {
    // If any error or table not yet migrated, still return null fields gracefully per spec
    return NextResponse.json({
      plain_text: null,
      timed_json: null,
      language: "en",
      source_attribution: null,
    });
  }
}
