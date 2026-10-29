import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { PhotoAsset } from "../../types/media-contracts.ts";
import { INITIAL_PRELOADED_PHOTOS } from "../media-service.ts";

export const DEFAULT_GOOGLE_PHOTOS_ALBUM_URL =
  "https://photos.app.goo.gl/AMwLcQS5GN7dWf819";

export const DEFAULT_PHOTO_STORAGE_PROVIDER = "google_cdn";

export const GOOGLE_PHOTOS_IMAGE_REGEX =
  /https:\/\/lh3\.googleusercontent\.com\/pw\/[A-Za-z0-9_-]+/g;

export interface GooglePhotosManifest {
  albumUrl: string;
  syncedAt: string;
  total: number;
  provider: string;
  photos: PhotoAsset[];
}

export interface GooglePhotosServiceOptions {
  refresh?: boolean;
  albumUrl?: string;
  fetchFn?: typeof fetch;
}

let inMemoryPhotosCache: PhotoAsset[] | null = null;
let lastSyncTimestamp: string | null = null;

/**
 * Resolves Google Photos album URL using the precedence:
 * 1. Explicit parameter or override
 * 2. process.env.GOOGLE_PHOTOS_ALBUM_URL
 * 3. Prompt URL / Project default (https://photos.app.goo.gl/AMwLcQS5GN7dWf819)
 */
export function resolveAlbumUrl(urlOverride?: string): string {
  if (urlOverride && typeof urlOverride === "string" && urlOverride.trim().length > 0) {
    return urlOverride.trim();
  }
  if (typeof process !== "undefined" && process.env?.GOOGLE_PHOTOS_ALBUM_URL) {
    const envUrl = process.env.GOOGLE_PHOTOS_ALBUM_URL.trim();
    if (envUrl.length > 0) {
      return envUrl;
    }
  }
  return DEFAULT_GOOGLE_PHOTOS_ALBUM_URL;
}

/**
 * Resolves the photo storage provider (e.g. "google_cdn", "local", "supabase")
 */
export function resolveStorageProvider(): string {
  if (typeof process !== "undefined" && process.env?.PHOTO_STORAGE_PROVIDER) {
    const provider = process.env.PHOTO_STORAGE_PROVIDER.trim();
    if (provider.length > 0) {
      return provider;
    }
  }
  return DEFAULT_PHOTO_STORAGE_PROVIDER;
}

/**
 * Resolves optional custom asset base URL override (PHOTO_ASSET_BASE_URL)
 */
export function resolveAssetBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.PHOTO_ASSET_BASE_URL) {
    return process.env.PHOTO_ASSET_BASE_URL.trim();
  }
  return "";
}

/**
 * Generates a stable deterministic hash for a string
 */
export function computeStableHash(input: string): string {
  try {
    return createHash("sha256").update(input).digest("hex");
  } catch {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  }
}

/**
 * Generates a stable ID for a Google Photos asset
 */
export function generatePhotoId(baseUrl: string): string {
  const hash = computeStableHash(baseUrl).slice(0, 16);
  return `gphoto_${hash}`;
}

/**
 * Extracts unique Google Photos image URLs from raw HTML
 */
export function extractGooglePhotosUrls(html: string): string[] {
  if (!html || typeof html !== "string") {
    return [];
  }
  const matches = html.match(GOOGLE_PHOTOS_IMAGE_REGEX);
  if (!matches) {
    return [];
  }
  // Deduplicate preserving order
  const seen = new Set<string>();
  const uniqueUrls: string[] = [];
  for (const url of matches) {
    const cleanUrl = url.replace(/=[^=]*$/, "");
    if (!seen.has(cleanUrl)) {
      seen.add(cleanUrl);
      uniqueUrls.push(cleanUrl);
    }
  }
  return uniqueUrls;
}

/**
 * Formats responsive derivative URLs:
 * - originalUrl: =s0
 * - fullDisplayUrl: =w1600-h1600-no
 * - thumbnailUrl: =w400-h400-c
 * - url (display): =w1200-h1200-no
 */
export function buildPhotoDerivatives(
  baseUrl: string,
  baseOverride?: string
): {
  url: string;
  originalUrl: string;
  fullDisplayUrl: string;
  thumbnailUrl: string;
} {
  const cleanBase = baseUrl.replace(/=[^=]*$/, "");
  let targetBase = cleanBase;

  const override = baseOverride ?? resolveAssetBaseUrl();
  if (override && override.length > 0) {
    const trimmedOverride = override.replace(/\/+$/, "");
    targetBase = cleanBase.replace(/^https:\/\/lh3\.googleusercontent\.com/, trimmedOverride);
  }

  return {
    url: `${targetBase}=w1200-h1200-no`,
    originalUrl: `${targetBase}=s0`,
    fullDisplayUrl: `${targetBase}=w1600-h1600-no`,
    thumbnailUrl: `${targetBase}=w400-h400-c`,
  };
}

interface ParsedMetaItem {
  captureDate?: string;
  hasKnownCaptureDate: boolean;
  width?: number;
  height?: number;
}

/**
 * Extracts structured metadata from Google Photos initialization callback (AF_initDataCallback ds:1)
 * Extracts reliable capture timestamps and dimensions when present.
 * Strictly adheres to rule: NEVER fabricate dates.
 */
export function extractGooglePhotosMetadata(html: string): Map<string, ParsedMetaItem> {
  const metaMap = new Map<string, ParsedMetaItem>();
  if (!html || typeof html !== "string") {
    return metaMap;
  }

  const scriptRegex = /AF_initDataCallback\(\{key:\s*'ds:1'[\s\S]*?data:([\s\S]*?),\s*sideChannel:/;
  const match = html.match(scriptRegex);
  if (!match || !match[1]) {
    return metaMap;
  }

  try {
    const parsed = JSON.parse(match[1]);
    const items = parsed && Array.isArray(parsed[1]) ? parsed[1] : [];

    for (const item of items) {
      if (!item || !Array.isArray(item)) continue;
      const mediaUrls = item[1];
      if (!Array.isArray(mediaUrls) || typeof mediaUrls[0] !== "string") continue;

      const rawUrl = mediaUrls[0];
      const cleanUrl = rawUrl.replace(/=[^=]*$/, "");

      const width = typeof mediaUrls[1] === "number" ? mediaUrls[1] : undefined;
      const height = typeof mediaUrls[2] === "number" ? mediaUrls[2] : undefined;

      const timestampRaw = item[2];
      let captureDate: string | undefined;
      let hasKnownCaptureDate = false;

      // Validate timestamp is a realistic millisecond epoch (years 2000-2050)
      if (
        typeof timestampRaw === "number" &&
        timestampRaw > 946684800000 &&
        timestampRaw < 2524608000000
      ) {
        try {
          const date = new Date(timestampRaw);
          if (!isNaN(date.getTime())) {
            captureDate = date.toISOString();
            hasKnownCaptureDate = true;
          }
        } catch {
          // If date conversion fails, leave as unknown
        }
      }

      metaMap.set(cleanUrl, {
        captureDate,
        hasKnownCaptureDate,
        width,
        height,
      });
    }
  } catch {
    // Gracefully ignore parse errors; fallback handles missing metadata
  }

  return metaMap;
}

/**
 * Helper to get local manifest file path on disk
 */
function getManifestPath(): string | null {
  if (typeof process === "undefined" || !process.cwd) {
    return null;
  }
  try {
    return path.resolve(process.cwd(), "src", "data", "google-photos-manifest.json");
  } catch {
    return null;
  }
}

/**
 * Safely reads the cached manifest from disk
 */
export function readLocalManifest(): PhotoAsset[] | null {
  const filePath = getManifestPath();
  if (!filePath) return null;

  try {
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed: GooglePhotosManifest = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.photos) && parsed.photos.length > 0) {
      return parsed.photos;
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

/**
 * Safely writes the manifest to disk
 */
export function writeLocalManifest(manifest: GooglePhotosManifest): boolean {
  const filePath = getManifestPath();
  if (!filePath) return false;

  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches and ingests a Google Photos shared album.
 * Follows redirects, extracts image URLs, applies responsive derivatives,
 * assigns stable IDs, and gracefully falls back to local manifest or initial photos
 * if offline or unreachable.
 */
export async function fetchGooglePhotosAlbum(
  albumUrl?: string,
  fetchFn: typeof fetch = fetch
): Promise<PhotoAsset[]> {
  const targetUrl = resolveAlbumUrl(albumUrl);
  const now = new Date().toISOString();
  const provider = resolveStorageProvider();
  const assetBaseOverride = resolveAssetBaseUrl();

  try {
    const res = await fetchFn(targetUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      throw new Error(`Google Photos album returned HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    const uniqueBaseUrls = extractGooglePhotosUrls(html);

    if (uniqueBaseUrls.length === 0) {
      throw new Error("No Google Photos images detected in album response");
    }

    const metadataMap = extractGooglePhotosMetadata(html);

    const assets: PhotoAsset[] = uniqueBaseUrls.map((baseUrl, index) => {
      const stableId = generatePhotoId(baseUrl);
      const derivatives = buildPhotoDerivatives(baseUrl, assetBaseOverride);
      const meta = metadataMap.get(baseUrl);

      const hasKnownCaptureDate = Boolean(meta?.hasKnownCaptureDate && meta?.captureDate);
      const effectiveCaptureDate = hasKnownCaptureDate && meta?.captureDate ? meta.captureDate : "";

      const asset: PhotoAsset = {
        id: stableId,
        galleryCategory: "main",
        contentHash: computeStableHash(baseUrl),
        mediaKind: "image",
        url: derivatives.url,
        originalUrl: derivatives.originalUrl,
        fullDisplayUrl: derivatives.fullDisplayUrl,
        thumbnailUrl: derivatives.thumbnailUrl,
        storagePath: `google-photos/${stableId}.jpg`,
        effectiveCaptureDate,
        hasKnownCaptureDate,
        uploadTimestamp: now,
        width: meta?.width,
        height: meta?.height,
        status: "ready",
        metadata: {
          provider,
          albumUrl: targetUrl,
          rawUrl: baseUrl,
          albumIndex: index,
        },
      };

      return asset;
    });

    return assets;
  } catch {
    // Graceful offline fallback: try local manifest first
    const localManifestPhotos = readLocalManifest();
    if (localManifestPhotos && localManifestPhotos.length > 0) {
      return localManifestPhotos;
    }

    // Secondary fallback: initial preloaded photos
    return [...INITIAL_PRELOADED_PHOTOS];
  }
}

/**
 * High-level accessor with in-memory caching and persistent fallback.
 */
export async function getGooglePhotos(
  options?: GooglePhotosServiceOptions
): Promise<PhotoAsset[]> {
  const shouldRefresh = options?.refresh ?? false;

  if (!shouldRefresh && inMemoryPhotosCache && inMemoryPhotosCache.length > 0) {
    return inMemoryPhotosCache;
  }

  const albumUrl = resolveAlbumUrl(options?.albumUrl);
  const photos = await fetchGooglePhotosAlbum(albumUrl, options?.fetchFn);

  if (photos && photos.length > 0) {
    inMemoryPhotosCache = photos;
    lastSyncTimestamp = new Date().toISOString();

    // Persist to local manifest if on node
    writeLocalManifest({
      albumUrl,
      syncedAt: lastSyncTimestamp,
      total: photos.length,
      provider: resolveStorageProvider(),
      photos,
    });
  }

  return photos;
}

/**
 * Resets the in-memory cache (for testing or re-syncing)
 */
export function resetInMemoryCache(): void {
  inMemoryPhotosCache = null;
  lastSyncTimestamp = null;
}

/**
 * Returns cache metadata
 */
export function getCacheMetadata(): {
  isCached: boolean;
  cachedCount: number;
  lastSyncedAt: string | null;
} {
  return {
    isCached: inMemoryPhotosCache !== null,
    cachedCount: inMemoryPhotosCache?.length ?? 0,
    lastSyncedAt: lastSyncTimestamp,
  };
}
