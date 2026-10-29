import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/music/tracks
// Returns published tracks with optional liked status for current user
export async function GET() {
  try {
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    const hasBirthday = await readScope("birthday");

    if (!user && !hasBirthday) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = user ? sb : getAdminClient();

    const [tracksRes, likesRes] = await Promise.all([
      db
        .from("music_tracks")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      user
        ? sb.from("music_likes").select("track_id").eq("user_id", user.id)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (tracksRes.error) {
      return NextResponse.json({ error: tracksRes.error.message }, { status: 500 });
    }

    const likedSet = new Set((likesRes.data ?? []).map((l: { track_id: string }) => l.track_id));

    const tracks = (tracksRes.data ?? []).map((t) => ({
      ...t,
      is_liked: user ? likedSet.has(t.id) : false,
    }));

    return NextResponse.json(tracks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch tracks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
