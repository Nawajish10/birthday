#!/usr/bin/env node
/**
 * scripts/import-music.ts
 *
 * Batch-import CLI script for audio ingestion into the Birthday Music Library.
 *
 * Usage:
 *   npx tsx scripts/import-music.ts --manifest <path> --audio-dir <path> [--dry-run]
 *
 * Arguments:
 *   --manifest <path>    Path to CSV or JSON manifest file.
 *   --audio-dir <path>   Directory containing the audio files.
 *   --dry-run            Validate & compute checksums without uploading or modifying DB.
 *   --help, -h           Show this help message.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { getAdminClient } from "../src/lib/supabase/admin.ts";
import {
  extractAudioDuration,
  extractAudioMetadata,
  scanAudioDirectory,
} from "../src/lib/music/audio-importer.ts";

// ---------------------------------------------------------------------------
// Environment loader (loads .env.local / .env if not yet loaded)
// ---------------------------------------------------------------------------
function loadEnv() {
  const cwd = process.cwd();
  const envFiles = [path.join(cwd, ".env.local"), path.join(cwd, ".env")];

  for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) continue;
    try {
      const content = fs.readFileSync(envFile, "utf-8");
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = val;
        }
      }
    } catch {
      // Ignore env load failure
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ManifestItem {
  title: string;
  artist?: string;
  album?: string;
  audio_filename: string;
  playlist?: string;
  duration_seconds?: number;
}

export interface ImportOptions {
  manifestPath?: string;
  audioDir: string;
  dryRun?: boolean;
  playlist?: string;
}

export interface ImportReport {
  scanned: number;
  validated: number;
  uploaded: number;
  skipped: number;
  failed: number;
}

// ---------------------------------------------------------------------------
// Audio format & MIME helpers
// ---------------------------------------------------------------------------
const EXT_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
};

const ALLOWED_EXTENSIONS = Object.keys(EXT_TO_MIME);

function detectMimeType(filePath: string, buffer: Buffer): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return null;
  }

  // Magic bytes inspection
  if (buffer.length >= 3) {
    // ID3 tag
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return "audio/mpeg";
    }
  }
  if (buffer.length >= 2) {
    // MP3 raw frame sync
    if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
      return "audio/mpeg";
    }
    // AAC ADTS
    if (buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0) {
      return "audio/aac";
    }
  }
  if (buffer.length >= 12) {
    // WAV
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return "audio/wav";
    }
  }
  if (buffer.length >= 4) {
    // FLAC
    if (
      buffer[0] === 0x66 &&
      buffer[1] === 0x4c &&
      buffer[2] === 0x61 &&
      buffer[3] === 0x43
    ) {
      return "audio/flac";
    }
    // OGG
    if (
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return "audio/ogg";
    }
    // WebM / Matroska
    if (
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return "audio/webm";
    }
  }
  if (buffer.length >= 8) {
    // MP4 / M4A ('ftyp' at offset 4)
    if (
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70
    ) {
      return "audio/mp4";
    }
  }

  // Fallback to extension mapping
  return EXT_TO_MIME[ext] ?? null;
}

// ---------------------------------------------------------------------------
// Manifest parsing (CSV and JSON)
// ---------------------------------------------------------------------------
function parseCsv(content: string): ManifestItem[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        // skip carriage return
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) {
    throw new Error("CSV manifest is empty or missing data rows.");
  }

  const headers = rows[0].map((h) =>
    h.toLowerCase().trim().replace(/^[\uFEFF]/, "")
  );

  const getIdx = (name: string) => headers.indexOf(name);
  const titleIdx = getIdx("title");
  const filenameIdx =
    getIdx("audio_filename") !== -1
      ? getIdx("audio_filename")
      : getIdx("filename");
  const artistIdx = getIdx("artist");
  const albumIdx = getIdx("album");
  const playlistIdx = getIdx("playlist");
  const durationIdx =
    getIdx("duration_seconds") !== -1
      ? getIdx("duration_seconds")
      : getIdx("duration");

  if (titleIdx === -1 || filenameIdx === -1) {
    throw new Error(
      "CSV manifest must contain at least 'title' and 'audio_filename' headers."
    );
  }

  const items: ManifestItem[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const title = row[titleIdx] ?? "";
    const filename = row[filenameIdx] ?? "";
    if (!title && !filename) continue; // blank row

    const rawDuration = durationIdx !== -1 ? row[durationIdx] : undefined;
    const duration_seconds =
      rawDuration && !isNaN(Number(rawDuration))
        ? Math.round(Number(rawDuration))
        : undefined;

    items.push({
      title,
      audio_filename: filename,
      artist: artistIdx !== -1 ? row[artistIdx] || undefined : undefined,
      album: albumIdx !== -1 ? row[albumIdx] || undefined : undefined,
      playlist: playlistIdx !== -1 ? row[playlistIdx] || undefined : undefined,
      duration_seconds,
    });
  }

  return items;
}

function parseJson(content: string): ManifestItem[] {
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON manifest must be an array of track objects.");
  }

  return parsed.map((item, idx) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`JSON manifest item at index ${idx} is not an object.`);
    }
    const title = String(item.title ?? "").trim();
    const filename = String(item.audio_filename ?? item.filename ?? "").trim();
    const duration =
      item.duration_seconds !== undefined && item.duration_seconds !== null
        ? Number(item.duration_seconds)
        : undefined;

    return {
      title,
      audio_filename: filename,
      artist: item.artist ? String(item.artist).trim() : undefined,
      album: item.album ? String(item.album).trim() : undefined,
      playlist: item.playlist ? String(item.playlist).trim() : undefined,
      duration_seconds: !isNaN(Number(duration)) ? Math.round(Number(duration)) : undefined,
    };
  });
}

function loadManifest(manifestPath: string): ManifestItem[] {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, "utf-8");
  const ext = path.extname(manifestPath).toLowerCase();

  if (ext === ".json") {
    return parseJson(content);
  }
  if (ext === ".csv") {
    return parseCsv(content);
  }

  // Attempt JSON first, then CSV
  try {
    return parseJson(content);
  } catch {
    return parseCsv(content);
  }
}

// ---------------------------------------------------------------------------
// CLI Argument Parser
// ---------------------------------------------------------------------------
function printHelp() {
  console.log(`
Batch-Import CLI Script for Birthday Music Library
==================================================

Usage:
  npx tsx scripts/import-music.ts --audio-dir <path> [--manifest <path>] [--playlist <name>] [options]

Options:
  --audio-dir <path>   Directory containing local audio files (required).
  --manifest <path>    Path to CSV or JSON manifest file (optional; scans directory if omitted).
  --playlist <name>    Default playlist name to assign imported tracks (optional).
  --dry-run            Validate files & checksums without uploading to storage or DB.
  --help, -h           Show this help message.

Supported Formats:
  MP3, AAC, MP4, WAV, M4A, OGG, FLAC, WebM (Max 50MB per file).
`);
}

function parseArgs(args: string[]): ImportOptions {
  let manifestPath = "";
  let audioDir = "";
  let dryRun = false;
  let playlist = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--manifest") {
      manifestPath = args[++i] || "";
    } else if (arg.startsWith("--manifest=")) {
      manifestPath = arg.slice("--manifest=".length);
    } else if (arg === "--audio-dir") {
      audioDir = args[++i] || "";
    } else if (arg.startsWith("--audio-dir=")) {
      audioDir = arg.slice("--audio-dir=".length);
    } else if (arg === "--playlist") {
      playlist = args[++i] || "";
    } else if (arg.startsWith("--playlist=")) {
      playlist = arg.slice("--playlist=".length);
    }
  }

  if (!audioDir) {
    console.error("Error: Missing required argument --audio-dir.\n");
    printHelp();
    process.exit(1);
  }

  return {
    manifestPath: manifestPath ? path.resolve(process.cwd(), manifestPath) : undefined,
    audioDir: path.resolve(process.cwd(), audioDir),
    dryRun,
    playlist: playlist || undefined,
  };
}

// ---------------------------------------------------------------------------
// Main Ingestion Workflow
// ---------------------------------------------------------------------------
export async function runImport(options: ImportOptions): Promise<ImportReport> {
  const { manifestPath, audioDir, dryRun, playlist } = options;
  loadEnv();

  const report: ImportReport = {
    scanned: 0,
    validated: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
  };

  console.log("==================================================");
  console.log("             MUSIC BATCH IMPORT RUNNER             ");
  console.log("==================================================");
  console.log(`Manifest:    ${manifestPath || "(None - directory auto-scan)"}`);
  console.log(`Audio Dir:   ${audioDir}`);
  console.log(`Playlist:    ${playlist || "(From manifest or auto-assigned)"}`);
  console.log(`Mode:        ${dryRun ? "DRY-RUN (no storage or DB changes)" : "LIVE INGESTION"}`);
  console.log("--------------------------------------------------");

  if (!fs.existsSync(audioDir) || !fs.statSync(audioDir).isDirectory()) {
    console.error(`[FATAL] Audio directory not found or not a directory: ${audioDir}`);
    process.exit(1);
  }

  let items: ManifestItem[];
  if (manifestPath) {
    try {
      items = loadManifest(manifestPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[FATAL] Failed to read manifest: ${msg}`);
      process.exit(1);
    }
  } else {
    try {
      console.log(`Scanning audio directory for local audio files: ${audioDir}`);
      items = scanAudioDirectory(audioDir, playlist);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[FATAL] Failed to scan audio directory: ${msg}`);
      process.exit(1);
    }
  }

  report.scanned = items.length;
  console.log(`Loaded ${items.length} track entry/entries.\n`);

  // Supabase admin client initialization
  let adminDb: ReturnType<typeof getAdminClient> | null = null;
  try {
    adminDb = getAdminClient();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!dryRun) {
      console.error(`[FATAL] ${msg}`);
      process.exit(1);
    } else {
      console.warn(`[WARN] Supabase credentials not found. DB deduplication skipped in dry-run.`);
    }
  }

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const prefix = `[${idx + 1}/${items.length}]`;

    if (!item.title || !item.audio_filename) {
      console.error(`${prefix} [FAIL] Missing required title or audio_filename.`);
      report.failed++;
      continue;
    }

    const filePath = path.join(audioDir, item.audio_filename);
    if (!fs.existsSync(filePath)) {
      console.error(`${prefix} [FAIL] File does not exist: "${item.audio_filename}" at ${filePath}`);
      report.failed++;
      continue;
    }

    const stats = fs.statSync(filePath);
    if (stats.size < 1) {
      console.error(`${prefix} [FAIL] File is empty (0 bytes): "${item.audio_filename}"`);
      report.failed++;
      continue;
    }

    if (stats.size > 50 * 1024 * 1024) {
      console.error(
        `${prefix} [FAIL] File exceeds 50MB limit (${(stats.size / 1024 / 1024).toFixed(2)} MB): "${item.audio_filename}"`
      );
      report.failed++;
      continue;
    }

    // Read audio buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (readErr: unknown) {
      const msg = readErr instanceof Error ? readErr.message : String(readErr);
      console.error(`${prefix} [FAIL] Failed to read file: ${msg}`);
      report.failed++;
      continue;
    }

    // MIME and format detection
    const mimeType = detectMimeType(filePath, fileBuffer);
    if (!mimeType) {
      console.error(
        `${prefix} [FAIL] Unsupported audio format: "${item.audio_filename}". Allowed: MP3, WAV, M4A, AAC, OGG, FLAC, WebM.`
      );
      report.failed++;
      continue;
    }

    // Extract metadata and duration if missing
    if (item.duration_seconds === undefined || item.duration_seconds === null) {
      const extractedDur = extractAudioDuration(fileBuffer, item.audio_filename);
      if (extractedDur !== null) {
        item.duration_seconds = extractedDur;
      }
    }

    // SHA-256 Checksum
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Dry Run check - validate formats, sizes, durations, and checksums without live DB/storage calls
    if (dryRun) {
      console.log(
        `${prefix} [VALIDATED] "${item.title}" (${mimeType}, ${(stats.size / 1024 / 1024).toFixed(2)} MB, sha256:${checksum.slice(0, 10)}...)`
      );
      report.validated++;
      continue;
    }

    // Deduplication check
    let isDuplicate = false;
    if (adminDb) {
      try {
        // Check by checksum
        const { data: byChecksum, error: chkErr } = await adminDb
          .from("music_tracks")
          .select("id, title, artist, checksum")
          .eq("checksum", checksum)
          .limit(1);

        if (chkErr) {
          if (!chkErr.message.includes("does not exist")) {
            console.warn(`${prefix} [WARN] Error querying tracks by checksum: ${chkErr.message}`);
          }
        } else if (byChecksum && byChecksum.length > 0) {
          console.log(
            `${prefix} [SKIP] Track "${item.title}" duplicate found by SHA-256 checksum (${byChecksum[0].id}).`
          );
          isDuplicate = true;
        }

        // Check by Title + Artist if not already matched
        if (!isDuplicate) {
          const { data: byTitleArtist, error: taErr } = await adminDb
            .from("music_tracks")
            .select("id, title, artist")
            .ilike("title", item.title.trim())
            .ilike("artist", (item.artist || "").trim())
            .limit(1);

          if (taErr) {
            console.warn(`${prefix} [WARN] Error querying tracks by title/artist: ${taErr.message}`);
          } else if (byTitleArtist && byTitleArtist.length > 0) {
            console.log(
              `${prefix} [SKIP] Track "${item.title}" by "${item.artist || ""}" already exists (${byTitleArtist[0].id}).`
            );
            isDuplicate = true;
          }
        }
      } catch (dbErr: unknown) {
        console.warn(`${prefix} [WARN] Database deduplication check threw error:`, dbErr);
      }
    }

    if (isDuplicate) {
      report.skipped++;
      continue;
    }

    if (!adminDb) {
      console.error(`${prefix} [FAIL] Database client not available for upload.`);
      report.failed++;
      continue;
    }

    // Live Ingestion
    const trackId = crypto.randomUUID();
    const sanitizedFilename = item.audio_filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `audio/${trackId}/${sanitizedFilename}`;

    console.log(`${prefix} [UPLOADING] Storage: ${storageKey} (${mimeType})...`);

    // 1. Upload to Supabase Storage: birthday-audio
    const { error: storageError } = await adminDb.storage
      .from("birthday-audio")
      .upload(storageKey, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError) {
      console.error(`${prefix} [FAIL] Storage upload failed: ${storageError.message}`);
      report.failed++;
      continue;
    }

    // 2. Insert record into music_tracks table
    const { error: trackInsertError } = await adminDb.from("music_tracks").insert({
      id: trackId,
      title: item.title,
      artist: item.artist || "",
      album: item.album || null,
      media_path: storageKey,
      duration_seconds: item.duration_seconds ?? null,
      source_type: "imported",
      availability_status: "available",
      checksum,
      file_size_bytes: stats.size,
      mime_type: mimeType,
      is_published: true,
    });

    if (trackInsertError) {
      console.error(`${prefix} [FAIL] Database track insert failed: ${trackInsertError.message}`);
      // Clean up orphaned storage object
      await adminDb.storage.from("birthday-audio").remove([storageKey]);
      report.failed++;
      continue;
    }

    // 3. Playlist assignment if specified
    if (item.playlist && item.playlist.trim()) {
      const playlistName = item.playlist.trim();
      try {
        // Find existing playlist
        const { data: existingPlaylist } = await adminDb
          .from("music_playlists")
          .select("id")
          .eq("name", playlistName)
          .maybeSingle();

        let playlistId = existingPlaylist?.id;
        if (!playlistId) {
          const { data: newPlaylist, error: plErr } = await adminDb
            .from("music_playlists")
            .insert({
              name: playlistName,
              created_by: "admin",
              is_published: true,
            })
            .select("id")
            .single();

          if (plErr) {
            console.warn(`${prefix} [WARN] Could not create playlist "${playlistName}": ${plErr.message}`);
          } else {
            playlistId = newPlaylist.id;
          }
        }

        if (playlistId) {
          const { data: maxOrderData } = await adminDb
            .from("music_playlist_tracks")
            .select("sort_order")
            .eq("playlist_id", playlistId)
            .order("sort_order", { ascending: false })
            .limit(1)
            .maybeSingle();

          const sortOrder = (maxOrderData?.sort_order ?? -1) + 1;
          await adminDb.from("music_playlist_tracks").insert({
            playlist_id: playlistId,
            track_id: trackId,
            sort_order: sortOrder,
          });
          console.log(`${prefix} [PLAYLIST] Added to "${playlistName}" (order: ${sortOrder})`);
        }
      } catch (plErr: unknown) {
        console.warn(`${prefix} [WARN] Playlist assignment warning:`, plErr);
      }
    }

    console.log(`${prefix} [SUCCESS] Ingested "${item.title}" (ID: ${trackId})`);
    report.uploaded++;
    report.validated++;
  }

  // Print final summary report
  console.log("\n==================================================");
  console.log("            MUSIC INGESTION SUMMARY REPORT         ");
  console.log("==================================================");
  console.log(`Scanned:     ${report.scanned}`);
  console.log(`Validated:   ${report.validated}`);
  console.log(`Uploaded:    ${report.uploaded}`);
  console.log(`Skipped:     ${report.skipped} (duplicates)`);
  console.log(`Failed:      ${report.failed}`);
  console.log("==================================================");

  return report;
}

// ---------------------------------------------------------------------------
// Direct Execution
// ---------------------------------------------------------------------------
const isDirectExecution =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("import-music.ts") ||
  process.argv[1]?.endsWith("import-music.js");

if (isDirectExecution) {
  const options = parseArgs(process.argv.slice(2));
  runImport(options)
    .then((report) => {
      if (report.failed > 0) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("[FATAL ERROR]:", err);
      process.exit(1);
    });
}
