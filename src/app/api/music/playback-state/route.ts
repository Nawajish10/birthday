import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/music/playback-state - get user's saved playback state
export async function GET() {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await sb
      .from("music_playback_state")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "No saved playback state found." }, { status: 404 });
    }

    return NextResponse.json({
      trackId: data.track_id,
      track_id: data.track_id,
      positionSeconds: Number(data.position_seconds ?? 0),
      position_seconds: Number(data.position_seconds ?? 0),
      queueTrackIds: data.queue_track_ids ?? [],
      queue_track_ids: data.queue_track_ids ?? [],
      queueIndex: data.queue_index ?? 0,
      queue_index: data.queue_index ?? 0,
      isShuffle: Boolean(data.is_shuffle),
      is_shuffle: Boolean(data.is_shuffle),
      repeatMode: data.repeat_mode ?? "off",
      repeat_mode: data.repeat_mode ?? "off",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch playback state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/music/playback-state - save playback state
export async function PUT(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid playback state body." }, { status: 400 });
    }

    const track_id = body.track_id !== undefined ? body.track_id : (body.trackId !== undefined ? body.trackId : null);
    const position_seconds = typeof body.position_seconds === "number"
      ? body.position_seconds
      : (typeof body.positionSeconds === "number" ? body.positionSeconds : 0);

    const queue_track_ids = Array.isArray(body.queue_track_ids)
      ? body.queue_track_ids
      : (Array.isArray(body.queueTrackIds) ? body.queueTrackIds : []);

    const queue_index = typeof body.queue_index === "number"
      ? body.queue_index
      : (typeof body.queueIndex === "number" ? body.queueIndex : 0);

    const is_shuffle = typeof body.is_shuffle === "boolean"
      ? body.is_shuffle
      : (typeof body.isShuffle === "boolean" ? body.isShuffle : false);

    const rawRepeat = body.repeat_mode || body.repeatMode || "off";
    const repeat_mode = ["off", "one", "all"].includes(rawRepeat) ? rawRepeat : "off";

    const { error } = await sb
      .from("music_playback_state")
      .upsert(
        {
          user_id: user.id,
          track_id: track_id || null,
          position_seconds,
          queue_track_ids,
          queue_index,
          is_shuffle,
          repeat_mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save playback state";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
