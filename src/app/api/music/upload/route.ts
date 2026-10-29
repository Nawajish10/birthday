import { NextRequest, NextResponse } from "next/server";
import * as crypto from "node:crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { extractAudioDuration } from "@/lib/music/audio-importer";

export const dynamic = "force-dynamic";

function detectAudioMime(buffer: Uint8Array, headerMime?: string): string | null {
  if (buffer.length >= 3) {
    // MP3 with ID3 tag: 'ID3' (0x49, 0x44, 0x33)
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return "audio/mpeg";
    }
  }
  if (buffer.length >= 2) {
    // MP3 raw frame sync: 0xFF followed by 0xE0-0xFF
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
      return "audio/mpeg";
    }
    // AAC ADTS: 0xFF followed by 0xF0-0xF9
    if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
      return "audio/aac";
    }
  }
  if (buffer.length >= 12) {
    // WAV: 'RIFF' .... 'WAVE'
    if (
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x41 && buffer[10] === 0x56 && buffer[11] === 0x45
    ) {
      return "audio/wav";
    }
  }
  if (buffer.length >= 4) {
    // FLAC: 'fLaC' (0x66, 0x4C, 0x61, 0x43)
    if (buffer[0] === 0x66 && buffer[1] === 0x4c && buffer[2] === 0x61 && buffer[3] === 0x43) {
      return "audio/flac";
    }
    // OGG: 'OggS' (0x4F, 0x67, 0x67, 0x53)
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return "audio/ogg";
    }
    // WebM / Matroska: 0x1A 0x45 0xDF 0xA3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return "audio/webm";
    }
  }
  if (buffer.length >= 8) {
    // MP4 / M4A: 'ftyp' at offset 4
    if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
      return "audio/mp4";
    }
  }

  // Validate allowed header MIME types
  const allowed = [
    "audio/mpeg", "audio/mp3", "audio/mp4", "video/mp4", "audio/m4a", "audio/x-m4a",
    "audio/wav", "audio/x-wav", "audio/aac", "audio/ogg", "audio/webm", "audio/flac"
  ];
  if (headerMime && allowed.includes(headerMime.toLowerCase())) {
    const norm = headerMime.toLowerCase();
    if (norm === "audio/mp3") return "audio/mpeg";
    if (norm === "audio/m4a" || norm === "audio/x-m4a" || norm === "video/mp4") return "audio/mp4";
    if (norm === "audio/x-wav") return "audio/wav";
    return norm;
  }

  return null;
}

// POST /api/music/upload (admin only)
// Accepts multipart form data: file (audio), title, artist, album?, playlist_id?
export async function POST(req: NextRequest) {
  try {
    // 1. Verify caller is admin
    const sb = await getSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminClient();
    const { data: adminRecord } = await adminDb
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRecord) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required." },
        { status: 403 }
      );
    }

    // 2. Parse form data
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    // 3. Validate file size (max 50MB)
    if (file.size < 1 || file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file must be between 1 byte and 50 MB." },
        { status: 400 }
      );
    }

    // 4. Validate content-type from actual file bytes
    const slice = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(slice);
    const mimeType = detectAudioMime(bytes, file.type);

    if (!mimeType) {
      return NextResponse.json(
        { error: "Invalid audio format. Allowed: MP3, M4A, WAV, AAC, OGG, WebM, FLAC." },
        { status: 400 }
      );
    }

    const title = typeof formData.get("title") === "string" ? (formData.get("title") as string).trim() : "";
    if (!title) {
      return NextResponse.json({ error: "Track title is required." }, { status: 400 });
    }

    const artist = typeof formData.get("artist") === "string" ? (formData.get("artist") as string).trim() : "";
    const album = typeof formData.get("album") === "string" ? (formData.get("album") as string).trim() : null;
    const playlist_id = typeof formData.get("playlist_id") === "string" ? (formData.get("playlist_id") as string).trim() : null;

    const rawDuration = formData.get("duration_seconds");
    let duration_seconds = rawDuration !== null && !isNaN(Number(rawDuration))
      ? Math.round(Number(rawDuration))
      : null;

    // 5. Read full file buffer, compute SHA-256 checksum for content deduplication
    const arrayBuf = await file.arrayBuffer();
    const fileBuf = Buffer.from(arrayBuf);
    const checksum = crypto.createHash("sha256").update(fileBuf).digest("hex");

    if (duration_seconds === null) {
      duration_seconds = extractAudioDuration(fileBuf, file instanceof File ? file.name : undefined);
    }

    // Deduplication check: if track with identical content checksum already exists, return it
    const { data: existingTrack } = await adminDb
      .from("music_tracks")
      .select("*")
      .eq("checksum", checksum)
      .maybeSingle();

    if (existingTrack) {
      // If playlist_id provided, link existing track to playlist if not already linked
      if (playlist_id) {
        const { data: adminPlaylist } = await adminDb
          .from("music_playlists")
          .select("id")
          .eq("id", playlist_id)
          .maybeSingle();

        if (adminPlaylist) {
          const { data: existingLink } = await adminDb
            .from("music_playlist_tracks")
            .select("id")
            .eq("playlist_id", playlist_id)
            .eq("track_id", existingTrack.id)
            .maybeSingle();

          if (!existingLink) {
            const { data: maxOrder } = await adminDb
              .from("music_playlist_tracks")
              .select("sort_order")
              .eq("playlist_id", playlist_id)
              .order("sort_order", { ascending: false })
              .limit(1)
              .maybeSingle();

            await adminDb.from("music_playlist_tracks").insert({
              playlist_id,
              track_id: existingTrack.id,
              sort_order: (maxOrder?.sort_order ?? -1) + 1,
            });
          }
        }
      }
      return NextResponse.json(existingTrack, { status: 200 });
    }

    // 6. Generate a unique storage key: audio/{track_id}/{sanitized-filename}
    const track_id = crypto.randomUUID();
    const rawFileName = file instanceof File ? file.name : "track.mp3";
    const sanitizedName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `audio/${track_id}/${sanitizedName}`;

    // 7. Upload to birthday-audio bucket using admin client
    const { error: uploadError } = await adminDb.storage
      .from("birthday-audio")
      .upload(storageKey, fileBuf, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Failed to upload audio to storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 8. Insert record into music_tracks
    const { data: track, error: trackError } = await adminDb
      .from("music_tracks")
      .insert({
        id: track_id,
        title,
        artist: artist || "",
        album: album || null,
        media_path: storageKey,
        mime_type: mimeType,
        file_size_bytes: file.size,
        source_type: "imported",
        availability_status: "available",
        duration_seconds,
        checksum,
        is_published: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (trackError) {
      // Clean up uploaded audio on error
      await adminDb.storage.from("birthday-audio").remove([storageKey]);
      return NextResponse.json({ error: trackError.message }, { status: 500 });
    }

    // 8. If playlist_id provided and valid, add to music_playlist_tracks or user_playlist_tracks
    if (playlist_id) {
      const { data: adminPlaylist } = await adminDb
        .from("music_playlists")
        .select("id")
        .eq("id", playlist_id)
        .maybeSingle();

      if (adminPlaylist) {
        const { data: maxOrder } = await adminDb
          .from("music_playlist_tracks")
          .select("sort_order")
          .eq("playlist_id", playlist_id)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();

        await adminDb.from("music_playlist_tracks").insert({
          playlist_id,
          track_id,
          sort_order: (maxOrder?.sort_order ?? -1) + 1,
        });
      } else {
        const { data: userPlaylist } = await adminDb
          .from("user_playlists")
          .select("id")
          .eq("id", playlist_id)
          .maybeSingle();

        if (userPlaylist) {
          const { data: maxOrder } = await adminDb
            .from("user_playlist_tracks")
            .select("sort_order")
            .eq("playlist_id", playlist_id)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();

          await adminDb.from("user_playlist_tracks").insert({
            playlist_id,
            track_id,
            sort_order: (maxOrder?.sort_order ?? -1) + 1,
          });
        }
      }
    }

    // 9. Return the created track record
    return NextResponse.json(track, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to upload track";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
