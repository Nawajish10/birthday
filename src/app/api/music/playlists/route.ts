import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/music/playlists - list user's own playlists
export async function GET() {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: playlists, error } = await sb
      .from("user_playlists")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const playlistIds = (playlists ?? []).map((p) => p.id);
    const countMap = new Map<string, number>();

    if (playlistIds.length > 0) {
      const { data: trackCounts } = await sb
        .from("user_playlist_tracks")
        .select("playlist_id")
        .in("playlist_id", playlistIds);

      if (trackCounts) {
        for (const r of trackCounts as Array<{ playlist_id: string }>) {
          countMap.set(r.playlist_id, (countMap.get(r.playlist_id) || 0) + 1);
        }
      }
    }

    const result = (playlists ?? []).map((p) => ({
      ...p,
      track_count: countMap.get(p.id) || 0,
    }));

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch playlists";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/music/playlists - create a playlist (body: { name, description? })
export async function POST(req: NextRequest) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (name.length < 1 || name.length > 120) {
      return NextResponse.json(
        { error: "Playlist name must be between 1 and 120 characters." },
        { status: 400 }
      );
    }

    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const artwork_path = typeof body?.artwork_path === "string" ? body.artwork_path.trim() : null;

    const { data, error } = await sb
      .from("user_playlists")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        artwork_path: artwork_path || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ...data, track_count: 0, tracks: [] }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
