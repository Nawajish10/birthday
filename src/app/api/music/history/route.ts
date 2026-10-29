import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/music/history - get user's listening history (last 50, most recent first)
export async function GET(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);
    const limit = isNaN(limitParam) ? 50 : Math.max(1, Math.min(100, limitParam));

    const { data: historyRows, error } = await sb
      .from("music_listening_history")
      .select("id, track_id, played_at, completed, progress_seconds")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let trackMap = new Map<string, Record<string, unknown>>();
    if (historyRows && historyRows.length > 0) {
      const trackIds = Array.from(new Set(historyRows.map((r: { track_id: string }) => r.track_id)));
      const [tracksRes, likesRes] = await Promise.all([
        sb.from("music_tracks").select("*").in("id", trackIds),
        sb.from("music_likes").select("track_id").eq("user_id", user.id),
      ]);

      const likedSet = new Set((likesRes.data ?? []).map((l: { track_id: string }) => l.track_id));
      trackMap = new Map(
        (tracksRes.data ?? []).map((t: Record<string, unknown>) => [
          String(t.id),
          { ...t, is_liked: likedSet.has(String(t.id)) },
        ])
      );
    }

    const entries = (historyRows ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      track_id: row.track_id,
      played_at: row.played_at,
      completed: Boolean(row.completed),
      progress_seconds: row.progress_seconds !== null ? Number(row.progress_seconds) : null,
      track: trackMap.get(String(row.track_id)) || undefined,
    }));

    return NextResponse.json(entries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/music/history - record a history event (body: { track_id, completed?, progress_seconds? })
export async function POST(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const track_id = typeof body?.track_id === "string" ? body.track_id.trim() : (typeof body?.trackId === "string" ? body.trackId.trim() : "");

    if (!track_id) {
      return NextResponse.json({ error: "track_id is required." }, { status: 400 });
    }

    const completed = Boolean(body?.completed);
    const progress_seconds = typeof body?.progress_seconds === "number"
      ? body.progress_seconds
      : (typeof body?.progressSeconds === "number" ? body.progressSeconds : null);

    const { data, error } = await sb
      .from("music_listening_history")
      .insert({
        user_id: user.id,
        track_id,
        completed,
        progress_seconds,
        played_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record history event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
