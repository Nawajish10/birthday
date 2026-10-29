#!/usr/bin/env node
/**
 * CLI Tool: Import and Ingest Google Photos Shared Album
 *
 * Usage:
 *   npx tsx scripts/import-google-photos.ts
 *   node scripts/import-google-photos.ts
 *   node scripts/import-google-photos.ts --url "https://photos.app.goo.gl/AMwLcQS5GN7dWf819"
 */

import fs from "node:fs";
import path from "node:path";
import {
  fetchGooglePhotosAlbum,
  resolveAlbumUrl,
  resolveStorageProvider,
  writeLocalManifest,
  type GooglePhotosManifest,
} from "../src/lib/google-photos/google-photos-service.ts";

function parseArgs(): { albumUrl?: string; outputPath?: string } {
  const args = process.argv.slice(2);
  let albumUrl: string | undefined;
  let outputPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--url" || arg === "-u") {
      albumUrl = args[i + 1];
      i++;
    } else if (arg === "--output" || arg === "-o") {
      outputPath = args[i + 1];
      i++;
    } else if (arg.startsWith("http://") || arg.startsWith("https://")) {
      albumUrl = arg;
    }
  }

  return { albumUrl, outputPath };
}

async function main() {
  console.log("=================================================");
  console.log("📸 Google Photos Ingestion Pipeline CLI");
  console.log("=================================================");

  const { albumUrl: cliUrl, outputPath } = parseArgs();
  const targetAlbumUrl = resolveAlbumUrl(cliUrl);

  console.log(`Target Album URL:  ${targetAlbumUrl}`);
  console.log(`Storage Provider:  ${resolveStorageProvider()}`);

  if (!targetAlbumUrl.startsWith("http://") && !targetAlbumUrl.startsWith("https://")) {
    console.error("❌ Error: Invalid album URL provided. Must begin with http:// or https://");
    process.exit(1);
  }

  const startTime = Date.now();
  console.log("\n🔄 Fetching album contents and resolving CDN assets...");

  try {
    const photos = await fetchGooglePhotosAlbum(targetAlbumUrl);

    if (!photos || photos.length === 0) {
      console.warn("⚠️ Warning: No photos were extracted from the album.");
      process.exit(1);
    }

    const elapsedMs = Date.now() - startTime;
    const knownDates = photos.filter((p) => p.hasKnownCaptureDate).length;
    const unknownDates = photos.length - knownDates;
    const withDimensions = photos.filter((p) => p.width && p.height).length;

    console.log(`\n✅ Ingestion Succeeded in ${elapsedMs}ms!`);
    console.log("-------------------------------------------------");
    console.log(`Total Extracted Photos:     ${photos.length}`);
    console.log(`With Reliable Capture Date: ${knownDates}`);
    console.log(`Without Known Capture Date: ${unknownDates}`);
    console.log(`With Dimension Metadata:    ${withDimensions}`);

    // Print sample photo details
    const sample = photos[0];
    console.log("\n📷 Sample Asset [0]:");
    console.log(`  ID:           ${sample.id}`);
    console.log(`  Display URL:  ${sample.url}`);
    console.log(`  Thumbnail:    ${sample.thumbnailUrl}`);
    console.log(`  Full Display: ${sample.fullDisplayUrl}`);
    console.log(`  Original:     ${sample.originalUrl}`);
    console.log(`  Capture Date: ${sample.hasKnownCaptureDate ? sample.effectiveCaptureDate : "Unknown"}`);
    if (sample.width && sample.height) {
      console.log(`  Dimensions:   ${sample.width}x${sample.height}`);
    }

    const targetPath = outputPath
      ? path.resolve(process.cwd(), outputPath)
      : path.resolve(process.cwd(), "src", "data", "google-photos-manifest.json");

    const manifest: GooglePhotosManifest = {
      albumUrl: targetAlbumUrl,
      syncedAt: new Date().toISOString(),
      total: photos.length,
      provider: resolveStorageProvider(),
      photos,
    };

    if (outputPath) {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, JSON.stringify(manifest, null, 2), "utf-8");
    } else {
      writeLocalManifest(manifest);
    }

    const stats = fs.statSync(targetPath);
    console.log("-------------------------------------------------");
    console.log(`💾 Manifest saved to: ${targetPath}`);
    console.log(`📦 Manifest file size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log("=================================================\n");
  } catch (error) {
    console.error("\n❌ Fatal error running ingestion pipeline:", error);
    process.exit(1);
  }
}

main();
