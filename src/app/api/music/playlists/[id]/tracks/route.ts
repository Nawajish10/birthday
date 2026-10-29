import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifyPlaylistOwner(
  sb: Awaited<ReturnType<typeof getSupabaseServer>>,
  playlistId: string,
  userId: string
) {
  const { data } = await sb
    .from("user_playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

// POST /api/music/playlists/[id]/tracks - add track to playlist (body: { track_id, sort_order? })
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: playlistId } = await context.params;
    const isOwner = await verifyPlaylistOwner(sb, playlistId, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const track_id = typeof body?.track_id === "string" ? body.track_id.trim() : (typeof body?.trackId === "string" ? body.trackId.trim() : "");

    if (!track_id) {
      return NextResponse.json({ error: "track_id is required." }, { status: 400 });
    }

    let sort_order = typeof body?.sort_order === "number" ? body.sort_order : undefined;
    if (sort_order === undefined) {
      const { data: existingMax } = await sb
        .from("user_playlist_tracks")
        .select("sort_order")
        .eq("playlist_id", playlistId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sort_order = (existingMax?.sort_order ?? -1) + 1;
    }

    const { error } = await sb.from("user_playlist_tracks").insert({
      playlist_id: playlistId,
      track_id,
      sort_order,
    });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Track already in playlist." }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to add track to playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/music/playlists/[id]/tracks - remove track from playlist (body: { track_id } or query param)
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: playlistId } = await context.params;
    const isOwner = await verifyPlaylistOwner(sb, playlistId, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const queryTrackId = req.nextUrl.searchParams.get("track_id");
    const track_id = typeof body?.track_id === "string" ? body.track_id.trim() : (typeof body?.trackId === "string" ? body.trackId.trim() : (queryTrackId ? queryTrackId.trim() : ""));

    if (!track_id) {
      return NextResponse.json({ error: "track_id is required." }, { status: 400 });
    }

    const { error } = await sb
      .from("user_playlist_tracks")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("track_id", track_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove track from playlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/music/playlists/[id]/tracks - reorder tracks (body: { ordered_track_ids: string[] })
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: playlistId } = await context.params;
    const isOwner = await verifyPlaylistOwner(sb, playlistId, user.id);
    if (!isOwner) {
      return NextResponse.json({ error: "Playlist not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const ordered_track_ids = body?.ordered_track_ids || body?.orderedTrackIds;

    if (!Array.isArray(ordered_track_ids)) {
      return NextResponse.json(
        { error: "ordered_track_ids must be an array of track IDs." },
        { status: 400 }
      );
    }

    await Promise.all(
      ordered_track_ids.map((trackId: string, index: number) =>
        sb
          .from("user_playlist_tracks")
          .update({ sort_order: index })
          .eq("playlist_id", playlistId)
          .eq("track_id", trackId)
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reorder playlist tracks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
