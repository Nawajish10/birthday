import { NextResponse } from "next/server";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { GOOGLE_PHOTOS_DATA } from "@/lib/google-photos-data";
import { photoAssetToProfilePostItem, type ProfilePostItem } from "@/types/media-contracts";

function getFallbackProfilePosts(): ProfilePostItem[] {
  return GOOGLE_PHOTOS_DATA
    .filter((photo) => (photo.galleryCategory === "main" || !photo.galleryCategory) && !photo.isPrivate)
    .map((photo, index) => {
      const item = photoAssetToProfilePostItem(photo);
      item.sort_order = index;
      item.is_published = true;
      item.galleryCategory = "main";
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
        db.from("profile_posts").select("*").eq("is_published", true).order("sort_order"),
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
      // Strictly enforce that only images explicitly designated for Main Gallery are served
      if (!posts.error && posts.data && posts.data.length > 0) {
        const publicPosts = posts.data.filter((p: Record<string, unknown>) => {
          const cat = (p.gallery_category || p.galleryCategory) as string | undefined;
          const isPriv = p.is_private === true || cat === "private";
          if (isPriv) return false;
          return cat === "main" || !cat;
        });

        postsWithUrls = await Promise.all(
          publicPosts.map(async (p: Record<string, unknown>) => {
            const mediaPath = String(p.media_path || "");
            const signedRes = await db.storage.from("birthday-public").createSignedUrl(mediaPath, 3600);
            return {
              id: String(p.id),
              media_path: mediaPath,
              media_kind: (p.media_kind as "image" | "video") || "image",
              caption: String(p.caption || ""),
              alt_text: String(p.alt_text || ""),
              sort_order: typeof p.sort_order === "number" ? p.sort_order : 0,
              is_published: Boolean(p.is_published),
              galleryCategory: "main" as const,
              url: signedRes.data?.signedUrl ?? "",
            };
          })
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
