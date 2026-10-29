import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

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

export interface ExtractedAudioMetadata {
  title: string;
  artist?: string;
  album?: string;
  durationSeconds: number | null;
  mimeType: string | null;
  checksum: string;
  fileSizeBytes: number;
}

// ---------------------------------------------------------------------------
// MIME and Format Helpers
// ---------------------------------------------------------------------------

export const EXT_TO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".webm": "audio/webm",
};

export const ALLOWED_AUDIO_EXTENSIONS = Object.keys(EXT_TO_MIME);

export function detectMimeType(filePath: string, buffer: Buffer): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
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
// Duration Extraction from Audio Buffers
// ---------------------------------------------------------------------------

/**
 * Extracts approximate or exact duration in seconds from an audio buffer.
 * Supports WAV, MP4/M4A, MP3, and AAC without external native dependencies.
 */
export function extractAudioDuration(
  buffer: Buffer,
  filePathOrExt?: string
): number | null {
  if (!buffer || buffer.length < 12) return null;

  const ext = filePathOrExt ? path.extname(filePathOrExt).toLowerCase() : "";

  // 1. WAV extraction
  if (
    ext === ".wav" ||
    (buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45)
  ) {
    try {
      let offset = 12;
      let sampleRate = 0;
      let channels = 0;
      let bitsPerSample = 0;
      let byteRate = 0;
      let dataSize = 0;

      while (offset + 8 <= buffer.length) {
        const chunkId = buffer.toString("ascii", offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);

        if (chunkId === "fmt " && offset + 8 + 16 <= buffer.length) {
          channels = buffer.readUInt16LE(offset + 10);
          sampleRate = buffer.readUInt32LE(offset + 12);
          byteRate = buffer.readUInt32LE(offset + 16);
          bitsPerSample = buffer.readUInt16LE(offset + 22);
        } else if (chunkId === "data") {
          dataSize = chunkSize;
          break;
        }

        offset += 8 + chunkSize;
      }

      if (byteRate > 0 && dataSize > 0) {
        return Math.max(1, Math.round(dataSize / byteRate));
      }
      if (sampleRate > 0 && channels > 0 && bitsPerSample > 0 && dataSize > 0) {
        const bytesPerSec = sampleRate * channels * (bitsPerSample / 8);
        return Math.max(1, Math.round(dataSize / bytesPerSec));
      }
    } catch {
      // Safe fallback
    }
  }

  // 2. MP4 / M4A extraction (ISO BMFF: 'moov' -> 'mvhd')
  if (
    ext === ".mp4" ||
    ext === ".m4a" ||
    (buffer.length >= 8 &&
      buffer[4] === 0x66 &&
      buffer[5] === 0x74 &&
      buffer[6] === 0x79 &&
      buffer[7] === 0x70)
  ) {
    try {
      let offset = 0;
      while (offset + 8 <= buffer.length) {
        const boxSize = buffer.readUInt32BE(offset);
        if (boxSize < 8 || offset + boxSize > buffer.length) {
          // If boxSize is 1, 64-bit size, or end of scan
          break;
        }
        const boxType = buffer.toString("ascii", offset + 4, offset + 8);

        if (boxType === "moov") {
          // Scan inside moov box for mvhd
          let moovOffset = offset + 8;
          const moovEnd = offset + boxSize;

          while (moovOffset + 8 <= moovEnd) {
            const subSize = buffer.readUInt32BE(moovOffset);
            if (subSize < 8 || moovOffset + subSize > moovEnd) break;
            const subType = buffer.toString("ascii", moovOffset + 4, moovOffset + 8);

            if (subType === "mvhd") {
              const version = buffer[moovOffset + 8];
              let timeScale = 0;
              let duration = 0;

              if (version === 0 && moovOffset + 8 + 24 <= moovEnd) {
                timeScale = buffer.readUInt32BE(moovOffset + 8 + 12);
                duration = buffer.readUInt32BE(moovOffset + 8 + 16);
              } else if (version === 1 && moovOffset + 8 + 36 <= moovEnd) {
                timeScale = buffer.readUInt32BE(moovOffset + 8 + 20);
                // Read 64-bit duration as BigInt
                const durBig = buffer.readBigUInt64BE(moovOffset + 8 + 24);
                duration = Number(durBig);
              }

              if (timeScale > 0 && duration > 0) {
                return Math.max(1, Math.round(duration / timeScale));
              }
            }

            moovOffset += subSize;
          }
        }

        offset += boxSize;
      }
    } catch {
      // Safe fallback
    }
  }

  // 3. MP3 extraction
  if (
    ext === ".mp3" ||
    (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    try {
      let offset = 0;
      let id3Size = 0;

      // Skip ID3v2 header if present
      if (
        buffer.length >= 10 &&
        buffer[0] === 0x49 &&
        buffer[1] === 0x44 &&
        buffer[2] === 0x33
      ) {
        id3Size =
          10 +
          ((buffer[6] & 0x7f) << 21 |
            (buffer[7] & 0x7f) << 14 |
            (buffer[8] & 0x7f) << 7 |
            (buffer[9] & 0x7f));
        offset = id3Size;
      }

      // Find first MPEG sync frame
      while (offset + 4 < buffer.length) {
        if (buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
          const b1 = buffer[offset + 1];
          const b2 = buffer[offset + 2];

          const mpegVer = (b1 >> 3) & 3; // 3 = MPEG-1
          const layer = (b1 >> 1) & 3; // 1 = Layer III
          const bitrateIdx = (b2 >> 4) & 15;
          const sampleRateIdx = (b2 >> 2) & 3;

          // Standard MPEG-1 Layer 3 tables
          const sampleRates = [44100, 48000, 32000, 0];
          const bitrates = [
            0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0,
          ];

          const sampleRate = sampleRates[sampleRateIdx] || 44100;
          const bitrateKbps = bitrates[bitrateIdx] || 128;

          // Check for Xing / Info header
          const xingOffsets = [offset + 36, offset + 21, offset + 13];
          for (const xOff of xingOffsets) {
            if (xOff + 16 <= buffer.length) {
              const tag = buffer.toString("ascii", xOff, xOff + 4);
              if (tag === "Xing" || tag === "Info") {
                const flags = buffer.readUInt32BE(xOff + 4);
                if ((flags & 0x01) !== 0) {
                  const frameCount = buffer.readUInt32BE(xOff + 8);
                  if (frameCount > 0 && sampleRate > 0) {
                    const samplesPerFrame = layer === 1 ? 1152 : 1152;
                    return Math.max(
                      1,
                      Math.round((frameCount * samplesPerFrame) / sampleRate)
                    );
                  }
                }
              }
            }
          }

          // Fallback: estimate from bitrate and remaining audio bytes
          if (bitrateKbps > 0) {
            const audioBytes = Math.max(1, buffer.length - id3Size);
            const estSeconds = Math.round((audioBytes * 8) / (bitrateKbps * 1000));
            if (estSeconds > 0) return estSeconds;
          }

          break;
        }
        offset++;
      }
    } catch {
      // Safe fallback
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Audio Metadata Extraction (ID3, Filename Sanitization, Checksum)
// ---------------------------------------------------------------------------

/**
 * Parses raw ID3v2 text frame content safely.
 */
function parseId3Text(buffer: Buffer, start: number, end: number): string {
  if (start >= end || start >= buffer.length) return "";
  const encoding = buffer[start];
  const slice = buffer.slice(start + 1, Math.min(end, buffer.length));

  if (encoding === 0) {
    // ISO-8859-1 / ASCII
    return slice.toString("latin1").replace(/\0.*$/, "").trim();
  } else if (encoding === 1) {
    // UTF-16 with BOM
    return slice.toString("utf16le").replace(/\0.*$/, "").trim();
  } else if (encoding === 3) {
    // UTF-8
    return slice.toString("utf8").replace(/\0.*$/, "").trim();
  }
  return slice.toString("utf8").replace(/\0.*$/, "").trim();
}

/**
 * Extracts metadata from audio buffer and filename.
 */
export function extractAudioMetadata(
  buffer: Buffer,
  filePath: string
): ExtractedAudioMetadata {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = detectMimeType(filePath, buffer);
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
  const durationSeconds = extractAudioDuration(buffer, filePath);

  let title = "";
  let artist = "";
  let album = "";

  // 1. Try reading ID3v2 frames if MP3
  if (
    buffer.length >= 10 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    try {
      const id3Size =
        ((buffer[6] & 0x7f) << 21 |
          (buffer[7] & 0x7f) << 14 |
          (buffer[8] & 0x7f) << 7 |
          (buffer[9] & 0x7f)) + 10;

      let frameOffset = 10;
      const id3End = Math.min(id3Size, buffer.length);

      while (frameOffset + 10 <= id3End) {
        const frameId = buffer.toString("ascii", frameOffset, frameOffset + 4);
        if (!/^[A-Z0-9]{4}$/.test(frameId)) break;

        const frameSize = buffer.readUInt32BE(frameOffset + 4);
        if (frameSize <= 0 || frameOffset + 10 + frameSize > id3End) break;

        const contentStart = frameOffset + 10;
        const contentEnd = contentStart + frameSize;

        if (frameId === "TIT2" && !title) {
          title = parseId3Text(buffer, contentStart, contentEnd);
        } else if (frameId === "TPE1" && !artist) {
          artist = parseId3Text(buffer, contentStart, contentEnd);
        } else if (frameId === "TALB" && !album) {
          album = parseId3Text(buffer, contentStart, contentEnd);
        }

        frameOffset += 10 + frameSize;
      }
    } catch {
      // Safe fallback
    }
  }

  // 2. Clean filename fallback if title not found in tags
  if (!title) {
    const rawName = fileName.replace(/\.[^/.]+$/, "");
    // Check for "Artist - Title" format
    if (rawName.includes(" - ")) {
      const parts = rawName.split(" - ");
      if (parts.length >= 2) {
        // Strip track numbers if leading: e.g. "01"
        const possibleArtist = parts[0].replace(/^\d+[\s._-]+/, "").trim();
        const possibleTitle = parts.slice(1).join(" - ").trim();
        if (!artist && possibleArtist) artist = possibleArtist;
        title = possibleTitle;
      }
    }

    if (!title) {
      // Clean up underscores, dashes, leading numbers
      title = rawName
        .replace(/^\d+[\s._-]+/, "")
        .replace(/[_-]+/g, " ")
        .trim();
    }
  }

  if (!title) {
    title = fileName.replace(/\.[^/.]+$/, "") || "Untitled Track";
  }

  return {
    title,
    artist: artist || undefined,
    album: album || undefined,
    durationSeconds,
    mimeType,
    checksum,
    fileSizeBytes: buffer.length,
  };
}

// ---------------------------------------------------------------------------
// Manifest Parsing (CSV & JSON)
// ---------------------------------------------------------------------------

export function parseCsvManifest(content: string): ManifestItem[] {
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

export function parseJsonManifest(content: string): ManifestItem[] {
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
      duration_seconds:
        !isNaN(Number(duration)) ? Math.round(Number(duration)) : undefined,
    };
  });
}

export function loadManifest(manifestPath: string): ManifestItem[] {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`);
  }

  const content = fs.readFileSync(manifestPath, "utf-8");
  const ext = path.extname(manifestPath).toLowerCase();

  if (ext === ".json") {
    return parseJsonManifest(content);
  }
  if (ext === ".csv") {
    return parseCsvManifest(content);
  }

  // Attempt JSON first, then CSV
  try {
    return parseJsonManifest(content);
  } catch {
    return parseCsvManifest(content);
  }
}

// ---------------------------------------------------------------------------
// Directory Scanner for Local Audio Collections (20-30 audio files)
// ---------------------------------------------------------------------------

/**
 * Scans a directory for supported audio files and automatically builds
 * ManifestItems with extracted metadata, titles, and durations.
 */
export function scanAudioDirectory(
  dirPath: string,
  defaultPlaylist?: string
): ManifestItem[] {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Directory not found: ${dirPath}`);
  }

  const dirents = fs.readdirSync(dirPath, { withFileTypes: true });
  const items: ManifestItem[] = [];

  for (const dirent of dirents) {
    if (dirent.isDirectory()) continue;
    const ext = path.extname(dirent.name).toLowerCase();
    if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) continue;

    const fullPath = path.join(dirPath, dirent.name);
    try {
      const buffer = fs.readFileSync(fullPath);
      const meta = extractAudioMetadata(buffer, fullPath);

      items.push({
        title: meta.title,
        artist: meta.artist || "Local Artist",
        album: meta.album,
        audio_filename: dirent.name,
        playlist: defaultPlaylist || "Imported Audio",
        duration_seconds: meta.durationSeconds ?? undefined,
      });
    } catch {
      // Fallback on filename
      const cleanTitle = dirent.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
      items.push({
        title: cleanTitle,
        artist: "Local Artist",
        audio_filename: dirent.name,
        playlist: defaultPlaylist || "Imported Audio",
      });
    }
  }

  // Sort alphabetically by filename
  items.sort((a, b) => a.audio_filename.localeCompare(b.audio_filename));

  return items;
}
