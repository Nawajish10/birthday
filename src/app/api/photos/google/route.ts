import {
  getGooglePhotos,
  getCacheMetadata,
  resolveAlbumUrl,
} from "../../../../lib/google-photos/google-photos-service.ts";
import type { PhotoAsset } from "../../../../types/media-contracts.ts";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const customAlbumUrl = url.searchParams.get("albumUrl") || undefined;

    const cacheMetaBefore = getCacheMetadata();
    const photos: PhotoAsset[] = await getGooglePhotos({
      refresh: forceRefresh,
      albumUrl: customAlbumUrl,
    });

    const cacheMetaAfter = getCacheMetadata();
    const source = forceRefresh
      ? "network_refresh"
      : cacheMetaBefore.isCached
      ? "cache"
      : "google_photos";

    return Response.json(
      {
        photos,
        total: photos.length,
        source,
        syncedAt: cacheMetaAfter.lastSyncedAt || new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Google Photos";
    return Response.json(
      {
        photos: [],
        total: 0,
        source: "fallback",
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetAlbumUrl = body?.albumUrl ? resolveAlbumUrl(body.albumUrl) : undefined;

    const photos: PhotoAsset[] = await getGooglePhotos({
      refresh: true,
      albumUrl: targetAlbumUrl,
    });

    const cacheMeta = getCacheMetadata();

    return Response.json(
      {
        success: true,
        photos,
        total: photos.length,
        source: "refresh",
        syncedAt: cacheMeta.lastSyncedAt || new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh Google Photos";
    return Response.json(
      {
        success: false,
        photos: [],
        total: 0,
        source: "fallback",
        error: message,
      },
      { status: 500 }
    );
  }
}
