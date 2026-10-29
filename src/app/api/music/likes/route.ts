import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/music/likes - get current user's liked track IDs
export async function GET() {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await sb
      .from("music_likes")
      .select("track_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trackIds = (data ?? []).map((r: { track_id: string }) => r.track_id);
    return NextResponse.json(trackIds);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch likes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/music/likes - like a track (body: { track_id: string })
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
      return NextResponse.json({ error: "track_id is required" }, { status: 400 });
    }

    const { error } = await sb
      .from("music_likes")
      .upsert(
        { user_id: user.id, track_id },
        { onConflict: "user_id,track_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to like track";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/music/likes - unlike a track (body: { track_id: string } or query param)
export async function DELETE(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const queryTrackId = req.nextUrl.searchParams.get("track_id");
    const track_id = typeof body?.track_id === "string" ? body.track_id.trim() : (typeof body?.trackId === "string" ? body.trackId.trim() : (queryTrackId ? queryTrackId.trim() : ""));

    if (!track_id) {
      return NextResponse.json({ error: "track_id is required" }, { status: 400 });
    }

    const { error } = await sb
      .from("music_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("track_id", track_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to unlike track";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
