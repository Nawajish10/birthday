import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/music/playlists/[id] - get playlist with its tracks
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const { data: playlist, error: playlistError } = await sb
      .from("user_playlists")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (playlistError) {
      return NextResponse.json({ error: playlistError.message }, { status: 500 });
    }

    if (!playlist) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    // Fetch playlist tracks sorted by sort_order
    const { data: ptRows, error: ptError } = await sb
      .from("user_playlist_tracks")
      .select("track_id, sort_order, added_at")
      .eq("playlist_id", id)
      .order("sort_order", { ascending: true })
      .order("added_at", { ascending: true });

    if (ptError) {
      return NextResponse.json({ error: ptError.message }, { status: 500 });
    }

    let tracks: Record<string, unknown>[] = [];
    if (ptRows && ptRows.length > 0) {
      const trackIds = ptRows.map((r: { track_id: string }) => r.track_id);
      const [tracksRes, likesRes] = await Promise.all([
        sb.from("music_tracks").select("*").in("id", trackIds),
        sb.from("music_likes").select("track_id").eq("user_id", user.id),
      ]);

      const likedSet = new Set((likesRes.data ?? []).map((l: { track_id: string }) => l.track_id));
      const trackMap = new Map((tracksRes.data ?? []).map((t: Record<string, unknown>) => [String(t.id), t]));

      tracks = ptRows
        .map((r: { track_id: string; sort_order: number }) => {
          const t = trackMap.get(r.track_id);
          if (!t) return null;
          return {
            ...t,
            sort_order: r.sort_order,
            is_liked: likedSet.has(String(t.id)),
          };
        })
        .filter(Boolean) as Record<string, unknown>[];
    }

    return NextResponse.json({
      ...playlist,
      track_count: tracks.length,
      tracks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/music/playlists/[id] - rename/update playlist (body: { name?, description? })
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => null);

    const updates: Record<string, unknown> = {};

    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 1 || name.length > 120) {
        return NextResponse.json(
          { error: "Playlist name must be between 1 and 120 characters." },
          { status: 400 }
        );
      }
      updates.name = name;
    }

    if (body?.description !== undefined) {
      updates.description = typeof body.description === "string" ? body.description.trim() : null;
    }

    if (body?.artwork_path !== undefined) {
      updates.artwork_path = typeof body.artwork_path === "string" ? body.artwork_path.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }

    const { data, error } = await sb
      .from("user_playlists")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/music/playlists/[id] - delete playlist
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const { error } = await sb
      .from("user_playlists")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
