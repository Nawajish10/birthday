import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { readScope } from "@/lib/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";

async function getAdminUser() {
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("admin_users").select("role").eq("user_id", user.id).maybeSingle();
  return data ? user : null;
}

export async function POST(req: NextRequest) {
  const isAdmin = await getAdminUser();
  const jar = await cookies();
  let visitor = jar.get("meerah_visitor")?.value;

  if (!isAdmin) {
    if (!await readScope("birthday")) {
      return NextResponse.json({ error: "Birthday access required." }, { status: 401 });
    }
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
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No media file provided." }, { status: 400 });
  }

  // 50 MB limit as specified in schema
  if (file.size < 1 || file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "Media attachment must be between 1 byte and 50 MB." }, { status: 400 });
  }

  const isEncrypted = formData.get("is_encrypted") === "true";
  const rawFileName = (file instanceof File ? file.name : "attachment.bin").replace(/[^a-zA-Z0-9._-]/g, "_");
  const extension = rawFileName.split(".").pop() || "bin";
  const safeVisitorId = visitor || (isAdmin ? "admin" : "anon");
  const storagePath = `chat/${safeVisitorId}/${Date.now()}_${randomUUID().slice(0, 8)}.${isEncrypted ? "enc" : extension}`;

  const db = getAdminClient();
  const mimeType = isEncrypted ? "application/octet-stream" : (file.type || "application/octet-stream");

  // Attempt upload to chat-media, fallback gracefully to birthday-public if bucket migration is pending
  let targetBucket = "chat-media";
  const { error: uploadError } = await db.storage.from(targetBucket).upload(storagePath, file, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadError) {
    targetBucket = "birthday-public";
    const retry = await db.storage.from(targetBucket).upload(storagePath, file, {
      contentType: mimeType,
      upsert: false,
    });
    if (retry.error) {
      return NextResponse.json({ error: "Failed to upload media attachment." }, { status: 500 });
    }
  }

  // Generate 7-day signed URL for private access
  const { data: signed, error: signError } = await db.storage
    .from(targetBucket)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate media access URL." }, { status: 500 });
  }

  return NextResponse.json({
    url: signed.signedUrl,
    path: storagePath,
    bucket: targetBucket,
  });
}
