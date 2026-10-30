import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import ReactDOMServer from "react-dom/server";

const require = createRequire(import.meta.url);
const WORKSPACE_ROOT = process.cwd();

function loadTsxModule(relativePath: string) {
  const filePath = path.resolve(WORKSPACE_ROOT, relativePath);
  assert.ok(fs.existsSync(filePath), `File must exist at ${relativePath}`);

  const rawCode = fs.readFileSync(filePath, "utf-8");
  const cleanedCode = rawCode.replace(/import\s+['"][^'"]+\.css['"];?/g, "");
  const transpiled = ts.transpileModule(cleanedCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const moduleExports: any = {};
  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, require);

  return { moduleExports, rawCode, filePath };
}

describe("Dynamic Photo Collection & Asset Management", () => {
  const { moduleExports: photoCardsExports } = loadTsxModule(
    "src/components/landing/SwipeablePhotoCards.tsx"
  );
  const { moduleExports: memoriesPreviewExports } = loadTsxModule(
    "src/components/landing/MemoriesPreviewSection.tsx"
  );
  const { moduleExports: photoSelectionExports } = loadTsxModule(
    "src/lib/photo-selection.ts"
  );

  const {
    SwipeablePhotoCards,
    DEFAULT_PHOTOS,
    selectDynamicPhotos,
    isExcludedPhotoEntry,
    isValidMediaUrl,
  } = photoCardsExports;

  const {
    MemoriesPreviewSection,
    selectDynamicMemories,
  } = memoriesPreviewExports;

  test("1. Specific Requirement: Remove entries 5, 6, and 7 from DEFAULT_PHOTOS", () => {
    assert.ok(Array.isArray(DEFAULT_PHOTOS), "DEFAULT_PHOTOS must be an array");
    assert.equal(DEFAULT_PHOTOS.length, 4, "DEFAULT_PHOTOS must have exactly 4 curated photos (1-4)");

    const ids = DEFAULT_PHOTOS.map((p: any) => p.id);
    assert.deepEqual(ids, ["photo-1", "photo-2", "photo-3", "photo-4"]);

    // Explicitly verify 5, 6, 7 are absent
    assert.ok(!ids.includes("photo-5"), "photo-5 must NOT be in DEFAULT_PHOTOS");
    assert.ok(!ids.includes("photo-6"), "photo-6 must NOT be in DEFAULT_PHOTOS");
    assert.ok(!ids.includes("photo-7"), "photo-7 must NOT be in DEFAULT_PHOTOS");

    for (const photo of DEFAULT_PHOTOS) {
      assert.ok(!isExcludedPhotoEntry(photo), `Photo ${photo.id} must be allowed`);
    }
  });

  test("2. Exclusion Detection: isExcludedPhotoEntry identifies entries numbered 5, 6, and 7", () => {
    // ID-based exclusions
    assert.equal(isExcludedPhotoEntry({ id: "photo-5" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "photo-6" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "photo-7" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "photo_5" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "image-6" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "card-7" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "5" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "6" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "7" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "item-5" }), true);

    // Metadata-based exclusions
    assert.equal(isExcludedPhotoEntry({ id: "custom-a", metadata: { albumIndex: 5 } }), true);
    assert.equal(isExcludedPhotoEntry({ id: "custom-b", metadata: { albumIndex: 6 } }), true);
    assert.equal(isExcludedPhotoEntry({ id: "custom-c", metadata: { albumIndex: 7 } }), true);
    assert.equal(isExcludedPhotoEntry({ id: "custom-d", metadata: { entryNumber: 5 } }), true);

    // Label-based exclusions
    assert.equal(isExcludedPhotoEntry({ id: "custom-e", heading: "Memory 05" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "custom-f", title: "Photo 6" }), true);
    assert.equal(isExcludedPhotoEntry({ id: "custom-g", heading: "NO. 07" }), true);

    // Permitted entries (1, 2, 3, 4, 8, 9, etc.)
    assert.equal(isExcludedPhotoEntry({ id: "photo-1" }), false);
    assert.equal(isExcludedPhotoEntry({ id: "photo-2" }), false);
    assert.equal(isExcludedPhotoEntry({ id: "photo-3" }), false);
    assert.equal(isExcludedPhotoEntry({ id: "photo-4" }), false);
    assert.equal(isExcludedPhotoEntry({ id: "photo-8" }), false);
    assert.equal(isExcludedPhotoEntry({ id: "photo-9" }), false);
    assert.equal(isExcludedPhotoEntry({ id: "gphoto_special_birthday_popup" }), false);
    assert.equal(isExcludedPhotoEntry(null), true);
  });

  test("3. Dynamic Photo Selection: eliminates hardcoded index dependencies and preserves metadata", () => {
    const mixedRecords = [
      {
        id: "rec-1",
        url: "https://example.com/1.jpg",
        caption: "Golden morning laughter",
        date: "October 2025",
        heading: "A New Dawn",
      },
      {
        id: "photo-5", // Excluded entry 5
        url: "https://example.com/5.jpg",
        caption: "Should be removed",
        date: "Nov 2025",
      },
      {
        id: "rec-2",
        url: "https://example.com/2.jpg",
        caption: "Starlit conversations",
        date: "December 2025",
        heading: "Night Sky",
      },
      {
        id: "photo-6", // Excluded entry 6
        url: "https://example.com/6.jpg",
        caption: "Should be removed",
      },
      {
        id: "rec-3",
        url: "https://example.com/3.jpg",
        caption: "Cozy teapot warmth",
        date: "January 2026",
      },
      {
        id: "photo-7", // Excluded entry 7
        url: "https://example.com/7.jpg",
        caption: "Should be removed",
      },
      {
        id: "rec-4",
        url: "https://example.com/4.jpg",
        caption: "Birthday blooms and cake",
        date: "February 2026",
      },
    ];

    const selected = selectDynamicPhotos(mixedRecords);

    // Must remove 5, 6, 7 and keep all others in original order
    assert.equal(selected.length, 4);
    assert.deepEqual(
      selected.map((r: any) => r.id),
      ["rec-1", "rec-2", "rec-3", "rec-4"]
    );

    // Verify captions, dates, headings are preserved perfectly
    assert.equal(selected[0].caption, "Golden morning laughter");
    assert.equal(selected[0].date, "October 2025");
    assert.equal(selected[0].heading, "A New Dawn");
    assert.equal(selected[1].caption, "Starlit conversations");
    assert.equal(selected[2].date, "January 2026");
    assert.equal(selected[3].caption, "Birthday blooms and cake");

    // Dynamic selection with maxCount
    const capped = selectDynamicPhotos(mixedRecords, { maxCount: 2 });
    assert.equal(capped.length, 2);
    assert.equal(capped[0].id, "rec-1");
    assert.equal(capped[1].id, "rec-2");
  });

  test("4. URL Validation: isValidMediaUrl ensures valid load paths", () => {
    assert.equal(isValidMediaUrl("https://images.unsplash.com/photo-1"), true);
    assert.equal(isValidMediaUrl("http://cdn.example.com/photo.jpg"), true);
    assert.equal(isValidMediaUrl("/local/photo.png"), true);
    assert.equal(isValidMediaUrl("data:image/jpeg;base64,..."), true);
    assert.equal(isValidMediaUrl("blob:http://localhost:3000/xyz"), true);

    // Invalid URLs
    assert.equal(isValidMediaUrl(""), false);
    assert.equal(isValidMediaUrl("   "), false);
    assert.equal(isValidMediaUrl(null), false);
    assert.equal(isValidMediaUrl(undefined), false);
    assert.equal(isValidMediaUrl("null"), false);
    assert.equal(isValidMediaUrl("undefined"), false);
  });

  test("5. SwipeablePhotoCards: graceful fallback polaroid placeholder for missing/broken assets", () => {
    const testPhotos = [
      {
        id: "valid-1",
        url: "https://images.unsplash.com/photo-1513151233558-d860c5398176",
        heading: "Sparkler Magic",
        caption: "Sparklers lighting up the night sky.",
        date: "October 2025",
      },
      {
        id: "broken-1",
        url: "", // Missing URL
        heading: "Unseen Moment",
        caption: "A treasured memory without an image asset.",
        date: "November 2025",
      },
    ];

    // Render active card with missing URL (initialIndex: 1)
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(SwipeablePhotoCards, {
        photos: testPhotos,
        initialIndex: 1,
      })
    );

    // Assert fallback placeholder is rendered
    assert.ok(html.includes("polaroid-image-fallback"), "Renders polaroid-image-fallback container");
    assert.ok(html.includes("fallback-flower-icon"), "Displays floral ✿ symbol");
    assert.ok(html.includes("Memory in our hearts"), "Displays keepsake placeholder heading");

    // Assert caption, date, and narrative are preserved in polaroid chin
    assert.ok(html.includes("Unseen Moment"), "Preserves heading text in chin");
    assert.ok(html.includes("A treasured memory without an image asset."), "Preserves caption narrative");
    assert.ok(html.includes("November 2025"), "Preserves date stamp");

    // Assert position indicator dynamically shows total count (2), NOT hardcoded 6
    assert.ok(html.includes("Photo 2 of 2"), "Dynamically displays 'Photo 2 of 2'");
  });

  test("6. MemoriesPreviewSection: dynamic filtering and fallback polaroid placeholder", () => {
    const rawMemories = [
      { id: "mem-1", url: "https://example.com/1.jpg", caption: "Sweet laughter" },
      { id: "photo-5", url: "https://example.com/5.jpg", caption: "Excluded 5" },
      { id: "mem-2", url: "", caption: "Missing asset moment" }, // Broken/empty URL
      { id: "photo-6", url: "https://example.com/6.jpg", caption: "Excluded 6" },
      { id: "mem-3", url: "https://example.com/3.jpg", caption: "Twilight walk" },
      { id: "photo-7", url: "https://example.com/7.jpg", caption: "Excluded 7" },
      { id: "mem-4", url: "https://example.com/4.jpg", caption: "Birthday morning" },
    ];

    const selected = selectDynamicMemories(rawMemories, { maxCount: 4 });
    assert.equal(selected.length, 4);
    assert.deepEqual(
      selected.map((m: any) => m.id),
      ["mem-1", "mem-2", "mem-3", "mem-4"]
    );

    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(MemoriesPreviewSection, {
        memories: selected,
        onOpenMemories: () => {},
      })
    );

    // Assert excluded items 5, 6, 7 are absent from HTML
    assert.ok(!html.includes("Excluded 5"), "Excluded 5 must not be rendered");
    assert.ok(!html.includes("Excluded 6"), "Excluded 6 must not be rendered");
    assert.ok(!html.includes("Excluded 7"), "Excluded 7 must not be rendered");

    // Assert broken item (mem-2) renders fallback polaroid placeholder
    assert.ok(html.includes("memories-photo-fallback"), "Renders memories-photo-fallback");
    assert.ok(html.includes("memories-fallback-icon"), "Renders floral fallback icon");
    assert.ok(html.includes("Missing asset moment"), "Preserves caption for broken item");
  });

  test("7. Zero hardcoded index dependencies in dynamic selection", () => {
    // Collection of 10 arbitrary photos
    const customPhotos = Array.from({ length: 10 }, (_, i) => ({
      id: `custom-moment-${i + 1}`,
      url: `https://example.com/photo-${i + 1}.jpg`,
      caption: `Moment ${i + 1}`,
    }));

    const result = selectDynamicPhotos(customPhotos);

    // None should be excluded because none are numbered 5, 6, or 7
    assert.equal(result.length, 10);
    assert.equal(result[4].id, "custom-moment-5"); // 5th item has id 'custom-moment-5'
    assert.equal(result[5].id, "custom-moment-6");
    assert.equal(result[6].id, "custom-moment-7");

    // Order is strictly preserved
    for (let i = 0; i < 10; i++) {
      assert.equal(result[i].id, `custom-moment-${i + 1}`);
      assert.equal(result[i].caption, `Moment ${i + 1}`);
    }
  });
});
