import { NextRequest, NextResponse } from "next/server";
import { readScope } from "@/lib/session";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { getReleaseState } from "@/lib/release";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await readScope("birthday"))) {
    return NextResponse.json({ error: "Birthday access required." }, { status: 401 });
  }

  const jar = await cookies();
  let visitor = jar.get("meerah_visitor")?.value;
  if (!visitor) {
    visitor = randomUUID();
    jar.set("meerah_visitor", visitor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  const db = getAdminClient();
  const release = getReleaseState();

  try {
    const [giftsRes, revealsRes] = await Promise.all([
      db
        .from("birthday_gifts")
        .select("id, slot_number, title, hint, reward_type, reward_content, media_path, unlock_at, is_published")
        .eq("is_published", true)
        .order("slot_number"),
      db.from("gift_reveals").select("gift_id, revealed_at").eq("visitor_id", visitor),
    ]);

    if (giftsRes.error) throw giftsRes.error;
    if (revealsRes.error) throw revealsRes.error;

    const revealedIds = new Set((revealsRes.data ?? []).map((r) => r.gift_id));

    // Mask reward content on the server if the gift is not unlocked or not yet revealed
    const sanitizedGifts = (giftsRes.data ?? []).map((gift) => {
      const isRevealed = revealedIds.has(gift.id);
      const isAvailable =
        release.isReleased ||
        (gift.unlock_at && new Date(gift.unlock_at).getTime() <= Date.now());

      return {
        id: gift.id,
        slot_number: gift.slot_number,
        title: gift.title,
        hint: gift.hint,
        reward_type: gift.reward_type,
        media_path: gift.media_path,
        is_available: Boolean(isAvailable),
        is_revealed: isRevealed,
        // Server-side secret redaction:
        reward_content: isRevealed
          ? gift.reward_content
          : isAvailable
          ? "Tap to open your gift reveal!"
          : "Locked until October 30, 2026 (Asia/Kolkata).",
      };
    });

    return NextResponse.json(
      { gifts: sanitizedGifts, release },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "Failed to load gifts.";
    return NextResponse.json({ error: message || "Failed to load gifts." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await readScope("birthday"))) {
    return NextResponse.json({ error: "Birthday access required." }, { status: 401 });
  }

  const { gift_id } = await req.json().catch(() => ({}));
  if (!gift_id || typeof gift_id !== "string") {
    return NextResponse.json({ error: "Missing gift ID." }, { status: 400 });
  }

  const jar = await cookies();
  let visitor = jar.get("meerah_visitor")?.value;
  if (!visitor) {
    visitor = randomUUID();
    jar.set("meerah_visitor", visitor, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  const db = getAdminClient();
  const release = getReleaseState();

  try {
    const { data: gift, error: giftErr } = await db
      .from("birthday_gifts")
      .select("*")
      .eq("id", gift_id)
      .eq("is_published", true)
      .single();

    if (giftErr || !gift) {
      return NextResponse.json({ error: "Gift not found." }, { status: 404 });
    }

    const isAvailable =
      release.isReleased ||
      (gift.unlock_at && new Date(gift.unlock_at).getTime() <= Date.now());

    if (!isAvailable) {
      return NextResponse.json(
        { error: "This gift is not yet unlocked according to the release schedule." },
        { status: 403 }
      );
    }

    // Persist reveal in DB
    await db
      .from("gift_reveals")
      .upsert(
        { visitor_id: visitor, gift_id: gift.id },
        { onConflict: "visitor_id,gift_id", ignoreDuplicates: true }
      );

    return NextResponse.json(
      {
        gift: {
          id: gift.id,
          slot_number: gift.slot_number,
          title: gift.title,
          hint: gift.hint,
          reward_type: gift.reward_type,
          reward_content: gift.reward_content,
          media_path: gift.media_path,
          is_available: true,
          is_revealed: true,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "Failed to reveal gift.";
    return NextResponse.json({ error: message || "Failed to reveal gift." }, { status: 500 });
  }
}
