import { NextResponse } from "next/server";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { GOOGLE_PHOTOS_DATA } from "@/lib/google-photos-data";
import { photoAssetToProfilePostItem, type ProfilePostItem } from "@/types/media-contracts";

function getFallbackProfilePosts(): ProfilePostItem[] {
  return GOOGLE_PHOTOS_DATA.map((photo, index) => {
    const item = photoAssetToProfilePostItem(photo);
    item.sort_order = index;
    item.is_published = true;
    return item;
  });
}

export async function GET() {
  if (!await readScope("birthday")) {
    return NextResponse.json({ error: "Passcode required." }, { status: 401 });
  }

  try {
    let cardsData: unknown[] = [];
    let postsWithUrls: ProfilePostItem[] = [];
    let storiesWithUrls: unknown[] = [];
    let gamesData: unknown[] = [];

    try {
      const db = getAdminClient();
      const [cards, posts, stories, games] = await Promise.all([
        db.from("birthday_cards").select("id,title,body_en,body_ur,sort_order,is_published").eq("is_published", true).order("sort_order"),
        db.from("profile_posts").select("id,media_path,media_kind,caption,alt_text,sort_order,is_published").eq("is_published", true).order("sort_order"),
        db.from("story_items").select("id,media_path,media_kind,caption,sort_order,is_published").eq("is_published", true).order("sort_order"),
        db.from("games").select("id,title,instructions,reward_text,sort_order,is_published").eq("is_published", true).order("sort_order"),
      ]);

      if (!cards.error && cards.data) cardsData = cards.data;
      if (!games.error && games.data) gamesData = games.data;

      if (!stories.error && stories.data) {
        storiesWithUrls = await Promise.all(
          stories.data.map(async (s) => ({
            ...s,
            url: (await db.storage.from("birthday-public").createSignedUrl(s.media_path, 3600)).data?.signedUrl ?? "",
          }))
        );
      }

      // If Supabase profile_posts succeeds and returns rows, resolve storage signed URLs
      if (!posts.error && posts.data && posts.data.length > 0) {
        postsWithUrls = await Promise.all(
          posts.data.map(async (p) => ({
            ...p,
            url: (await db.storage.from("birthday-public").createSignedUrl(p.media_path, 3600)).data?.signedUrl ?? "",
          }))
        );
      }
    } catch {
      // Supabase unconfigured or connection error - handled gracefully below
    }

    // Gracefully fall back to converting GOOGLE_PHOTOS_DATA to ProfilePostItem
    // if Supabase profile_posts table query fails or returns 0 posts
    if (!postsWithUrls || postsWithUrls.length === 0) {
      postsWithUrls = getFallbackProfilePosts();
    }

    const { getReleaseState } = await import("@/lib/release");
    const release = getReleaseState();

    return NextResponse.json(
      {
        cards: cardsData,
        posts: postsWithUrls,
        stories: storiesWithUrls,
        games: gamesData,
        release,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Content service is not configured." }, { status: 503 });
  }
}
