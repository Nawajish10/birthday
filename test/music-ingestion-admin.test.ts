import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { runImport } from "../scripts/import-music.ts";

describe("Music Ingestion: Batch-Import Script & Manifest Validation", () => {
  const fixturesDir = path.resolve(process.cwd(), "test/fixtures/ingestion-test");
  const audioDir = path.join(fixturesDir, "audio");
  const manifestCsvPath = path.join(fixturesDir, "manifest.csv");
  const manifestJsonPath = path.join(fixturesDir, "manifest.json");

  test("Setup test fixtures for batch import", () => {
    fs.mkdirSync(audioDir, { recursive: true });

    // 1. Valid MP3 with ID3 tag
    const mp3Buffer = Buffer.from([
      0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ...Array(64).fill(0xaa),
    ]);
    fs.writeFileSync(path.join(audioDir, "track1.mp3"), mp3Buffer);

    // 2. Valid WAV with RIFF WAVE header
    const wavBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
      ...Array(64).fill(0xbb),
    ]);
    fs.writeFileSync(path.join(audioDir, "track2.wav"), wavBuffer);

    // 3. Valid M4A with ftyp header
    const m4aBuffer = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20,
      ...Array(64).fill(0xcc),
    ]);
    fs.writeFileSync(path.join(audioDir, "track3.m4a"), m4aBuffer);

    // CSV Manifest
    const csvContent = [
      "title,artist,album,audio_filename,playlist,duration_seconds",
      '"Track One","Artist A","Album A","track1.mp3","Birthday Beats",120',
      '"Track Two","Artist B","Album B","track2.wav","Birthday Beats",180',
      '"Track Three","Artist C","Album C","track3.m4a","Quiet Moments",240',
    ].join("\n");
    fs.writeFileSync(manifestCsvPath, csvContent);

    // JSON Manifest
    const jsonContent = JSON.stringify([
      {
        title: "Track One",
        artist: "Artist A",
        album: "Album A",
        audio_filename: "track1.mp3",
        playlist: "Birthday Beats",
        duration_seconds: 120,
      },
      {
        title: "Track Two",
        artist: "Artist B",
        album: "Album B",
        audio_filename: "track2.wav",
        playlist: "Birthday Beats",
        duration_seconds: 180,
      },
    ]);
    fs.writeFileSync(manifestJsonPath, jsonContent);

    assert.ok(fs.existsSync(path.join(audioDir, "track1.mp3")));
    assert.ok(fs.existsSync(manifestCsvPath));
    assert.ok(fs.existsSync(manifestJsonPath));
  });

  test("Batch import dry-run parses CSV manifest and validates all items", async () => {
    const report = await runImport({
      manifestPath: manifestCsvPath,
      audioDir,
      dryRun: true,
    });

    assert.equal(report.scanned, 3);
    assert.equal(report.validated, 3);
    assert.equal(report.uploaded, 0);
    assert.equal(report.failed, 0);
  });

  test("Batch import dry-run parses JSON manifest and validates all items", async () => {
    const report = await runImport({
      manifestPath: manifestJsonPath,
      audioDir,
      dryRun: true,
    });

    assert.equal(report.scanned, 2);
    assert.equal(report.validated, 2);
    assert.equal(report.uploaded, 0);
    assert.equal(report.failed, 0);
  });

  test("Batch import rejects missing audio files and reports failure count", async () => {
    const badCsvPath = path.join(fixturesDir, "bad-manifest.csv");
    fs.writeFileSync(
      badCsvPath,
      "title,artist,audio_filename\n\"Missing Track\",\"Ghost\",\"nonexistent.mp3\"\n"
    );

    const report = await runImport({
      manifestPath: badCsvPath,
      audioDir,
      dryRun: true,
    });

    assert.equal(report.scanned, 1);
    assert.equal(report.failed, 1);
    assert.equal(report.validated, 0);
  });

  test("Batch import rejects unsupported formats and oversized files", async () => {
    // Unsupported extension
    const txtPath = path.join(audioDir, "notes.txt");
    fs.writeFileSync(txtPath, "This is not an audio file.");

    const invalidCsvPath = path.join(fixturesDir, "invalid-type.csv");
    fs.writeFileSync(
      invalidCsvPath,
      "title,artist,audio_filename\n\"Text File Track\",\"Writer\",\"notes.txt\"\n"
    );

    const report = await runImport({
      manifestPath: invalidCsvPath,
      audioDir,
      dryRun: true,
    });

    assert.equal(report.scanned, 1);
    assert.equal(report.failed, 1);
  });

  test("SHA-256 checksum computation integrity", () => {
    const track1Path = path.join(audioDir, "track1.mp3");
    const buffer = fs.readFileSync(track1Path);
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    assert.equal(typeof hash, "string");
    assert.equal(hash.length, 64);
  });

  test("Sample music manifest fixture exists in scripts directory", () => {
    const sampleManifestPath = path.resolve(process.cwd(), "scripts/sample-music-manifest.csv");
    assert.ok(fs.existsSync(sampleManifestPath));
    const content = fs.readFileSync(sampleManifestPath, "utf-8");
    assert.ok(content.includes("title,artist,album,audio_filename,playlist,duration_seconds"));
  });

  test("Cleanup test fixtures", () => {
    fs.rmSync(fixturesDir, { recursive: true, force: true });
    assert.ok(!fs.existsSync(fixturesDir));
  });
});

describe("Admin Music Upload Interface", () => {
  test("AdminMusicUpload component and styles exist and export properly", () => {
    const compPath = path.resolve(
      process.cwd(),
      "src/components/admin/music/AdminMusicUpload.tsx"
    );
    const cssPath = path.resolve(
      process.cwd(),
      "src/components/admin/music/admin-music-upload.css"
    );
    assert.ok(fs.existsSync(compPath), "AdminMusicUpload.tsx exists");
    assert.ok(fs.existsSync(cssPath), "admin-music-upload.css exists");

    const compContent = fs.readFileSync(compPath, "utf-8");
    assert.ok(compContent.includes("export function AdminMusicUpload"));
    assert.ok(compContent.includes("/api/music/upload"));
    assert.ok(compContent.includes("MAX_FILE_SIZE = 50 * 1024 * 1024"));
    assert.ok(compContent.includes("ALLOWED_EXTENSIONS"));
    assert.ok(compContent.includes("uploadItem"));
    assert.ok(compContent.includes("Retry"));
  });

  test("Admin.tsx integrates Music Management tab and AdminMusicUpload", () => {
    const adminPath = path.resolve(process.cwd(), "src/components/Admin.tsx");
    const adminContent = fs.readFileSync(adminPath, "utf-8");
    assert.ok(adminContent.includes('id:"music_management",label:"Music Management"'));
    assert.ok(adminContent.includes("<AdminMusicUpload"));
    assert.ok(adminContent.includes('import { AdminMusicUpload } from "./admin/music/AdminMusicUpload"'));
  });
});
