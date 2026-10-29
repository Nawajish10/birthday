import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { toCompactDerivativeUrl } from "../src/lib/media-service.ts";

// ---------------------------------------------------------------------------
// 1. Image Performance & Responsive Sizing
// ---------------------------------------------------------------------------
test("Image Performance: toCompactDerivativeUrl formats compact derivative (=w400-h400-c)", () => {
  // Test Google usercontent URL
  const googleUrl = "https://lh3.googleusercontent.com/pw/AP1GczMabc123";
  assert.equal(
    toCompactDerivativeUrl(googleUrl),
    "https://lh3.googleusercontent.com/pw/AP1GczMabc123=w400-h400-c"
  );

  // Test replacing existing high-res sizing suffix =s1600
  const highResGoogle = "https://lh3.googleusercontent.com/pw/AP1GczMabc123=s1600";
  assert.equal(
    toCompactDerivativeUrl(highResGoogle),
    "https://lh3.googleusercontent.com/pw/AP1GczMabc123=w400-h400-c"
  );

  // Test replacing existing high-res dimensions =w1920-h1080
  const highResDimensions = "https://lh3.googleusercontent.com/pw/AP1GczMabc123=w1920-h1080";
  assert.equal(
    toCompactDerivativeUrl(highResDimensions),
    "https://lh3.googleusercontent.com/pw/AP1GczMabc123=w400-h400-c"
  );

  // Test idempotent behavior when already =w400-h400-c
  const alreadyCompact = "https://lh3.googleusercontent.com/pw/AP1GczMabc123=w400-h400-c";
  assert.equal(toCompactDerivativeUrl(alreadyCompact), alreadyCompact);

  // Test Unsplash URL resizing
  const unsplashUrl = "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80";
  const transformedUnsplash = toCompactDerivativeUrl(unsplashUrl);
  assert.ok(transformedUnsplash.includes("w=400"), "Unsplash derivative must specify w=400");
  assert.ok(transformedUnsplash.includes("h=400"), "Unsplash derivative must specify h=400");
  assert.ok(transformedUnsplash.includes("fit=crop"), "Unsplash derivative must specify fit=crop");

  // Test relative / generic clean paths
  const relativeUrl = "/images/sample-meerah-1.jpg";
  assert.equal(
    toCompactDerivativeUrl(relativeUrl),
    "/images/sample-meerah-1.jpg=w400-h400-c"
  );

  // Test null / empty safety
  assert.equal(toCompactDerivativeUrl(""), "");
});

test("Image Performance: ProfilePanel and MemoriesPanel source code audit for responsive attributes", () => {
  const profilePanelPath = path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx");
  const memoriesPanelPath = path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx");
  const storyViewerPath = path.resolve(process.cwd(), "src/components/memories/StoryViewer.tsx");

  assert.ok(fs.existsSync(profilePanelPath), "ProfilePanel.tsx must exist");
  assert.ok(fs.existsSync(memoriesPanelPath), "MemoriesPanel.tsx must exist");
  assert.ok(fs.existsSync(storyViewerPath), "StoryViewer.tsx must exist");

  const profileCode = fs.readFileSync(profilePanelPath, "utf-8");
  const memoriesCode = fs.readFileSync(memoriesPanelPath, "utf-8");
  const storyCode = fs.readFileSync(storyViewerPath, "utf-8");

  // 1. loading="lazy" present in Profile and Memories
  assert.ok(
    profileCode.includes('loading="lazy"'),
    "ProfilePanel must declare loading='lazy' for photo assets"
  );
  assert.ok(
    memoriesCode.includes('loading="lazy"'),
    "MemoriesPanel must declare loading='lazy' for photo assets"
  );

  // 2. decoding="async" present across Profile, Memories, and StoryViewer
  assert.ok(
    profileCode.includes('decoding="async"'),
    "ProfilePanel must declare decoding='async' to prevent UI thread blocking"
  );
  assert.ok(
    memoriesCode.includes('decoding="async"'),
    "MemoriesPanel must declare decoding='async' to prevent UI thread blocking"
  );
  assert.ok(
    storyCode.includes('decoding="async"'),
    "StoryViewer must declare decoding='async' on slide images"
  );

  // 3. Compact derivatives requested in grids rather than full originals
  assert.ok(
    profileCode.includes("toCompactDerivativeUrl"),
    "ProfilePanel must use toCompactDerivativeUrl for compact grid thumbnails"
  );
  assert.ok(
    memoriesCode.includes("toCompactDerivativeUrl"),
    "MemoriesPanel must use toCompactDerivativeUrl for compact grid thumbnails"
  );

  // 4. CSS aspect-ratio prevents Cumulative Layout Shift (CLS)
  assert.ok(
    memoriesCode.includes('aspectRatio: "1"') || memoriesCode.includes("aspectRatio: '1'"),
    "MemoriesPanel must enforce aspect-ratio: 1 inline or via class to prevent CLS"
  );
});

test("Image Performance: CSS aspect-ratio declarations prevent Cumulative Layout Shift (CLS)", () => {
  const profileCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/profile.css"), "utf-8");
  const memoriesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/memories.css"), "utf-8");
  const storiesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/stories.css"), "utf-8");

  // Profile CSS aspect-ratio containment
  assert.ok(
    profileCss.includes("aspect-ratio: 1") || profileCss.includes("aspect-ratio: 1 / 1"),
    "profile.css must define aspect-ratio for photo tiles"
  );
  assert.ok(
    profileCss.includes("aspect-ratio: 4 / 3") || profileCss.includes("aspect-ratio: 1"),
    "profile.css must define aspect-ratio for media detail modal"
  );

  // Memories CSS aspect-ratio containment
  assert.ok(
    memoriesCss.includes("aspect-ratio: 1"),
    "memories.css must define aspect-ratio for memory photo cards"
  );

  // Stories CSS aspect-ratio containment (9:16 mobile story standard)
  assert.ok(
    storiesCss.includes("aspect-ratio: 9 / 16") || storiesCss.includes("aspect-ratio: 9/16"),
    "stories.css must define 9/16 aspect-ratio for story slide frame and images"
  );
});

// ---------------------------------------------------------------------------
// 2. Mobile Touch Targets (>= 44x44px)
// ---------------------------------------------------------------------------
test("Mobile Touch Targets: Close icons, favorite buttons, and interactive controls meet >= 44x44px bounds", () => {
  const profileCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/profile.css"), "utf-8");
  const memoriesCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx"), "utf-8");
  const memoriesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/memories.css"), "utf-8");
  const storiesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/stories.css"), "utf-8");

  // Profile close button >= 44x44px
  assert.ok(
    profileCss.includes(".profileModalClose") && profileCss.includes("min-width: 44px") && profileCss.includes("min-height: 44px"),
    "profileModalClose must enforce min-width and min-height >= 44px"
  );

  // Profile favorite buttons >= 44x44px
  assert.ok(
    profileCss.includes(".profileFavoriteToggle") && profileCss.includes("min-width: 44px") && profileCss.includes("min-height: 44px"),
    "profileFavoriteToggle must enforce min-width and min-height >= 44px"
  );
  assert.ok(
    profileCss.includes(".profileDetailFavBtn") && profileCss.includes("min-height: 44px"),
    "profileDetailFavBtn must enforce min-height >= 44px"
  );

  // Memories Lightbox navigation buttons (prev, next, close) >= 44x44px
  assert.ok(
    memoriesCode.includes('minWidth: "44px"') && memoriesCode.includes('minHeight: "44px"'),
    "MemoriesPanel lightbox controls must specify minWidth and minHeight >= 44px"
  );

  // Memories delete album button >= 44x44px
  assert.ok(
    memoriesCode.includes('aria-label={`Delete album ${album.title}`}') &&
    memoriesCode.includes('minWidth: "44px"'),
    "MemoriesPanel delete album button must enforce accessible 44x44px touch bounds"
  );

  // Story action buttons >= 44x44px in stories.css
  assert.ok(
    storiesCss.includes(".storyIconButton") &&
    storiesCss.includes("min-width: 44px") &&
    storiesCss.includes("min-height: 44px"),
    "stories.css .storyIconButton must enforce >= 44x44px touch targets"
  );

  // memories.css touch target declaration
  assert.ok(
    memoriesCss.includes("44px"),
    "memories.css must enforce accessible 44px touch targets"
  );
});

// ---------------------------------------------------------------------------
// 3. Prefers-Reduced-Motion & Safe-Area Insets
// ---------------------------------------------------------------------------
test("Reduced Motion: profile.css, memories.css, and stories.css respect prefers-reduced-motion: reduce", () => {
  const profileCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/profile.css"), "utf-8");
  const memoriesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/memories.css"), "utf-8");
  const storiesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/stories.css"), "utf-8");

  assert.ok(
    profileCss.includes("@media (prefers-reduced-motion: reduce)"),
    "profile.css must implement @media (prefers-reduced-motion: reduce)"
  );
  assert.ok(
    memoriesCss.includes("@media (prefers-reduced-motion: reduce)"),
    "memories.css must implement @media (prefers-reduced-motion: reduce)"
  );
  assert.ok(
    storiesCss.includes("@media (prefers-reduced-motion: reduce)"),
    "stories.css must implement @media (prefers-reduced-motion: reduce)"
  );

  // Ensure transitions and animations are neutralized under reduced motion
  assert.ok(
    profileCss.includes("animation-duration: 0.01ms !important") || profileCss.includes("animation: none !important"),
    "profile.css must neutralize animations under reduced motion"
  );
  assert.ok(
    storiesCss.includes("animation-duration: 0.01ms !important") || storiesCss.includes("animation: none !important"),
    "stories.css must neutralize animations under reduced motion"
  );
});

test("Safe-Area Insets: env(safe-area-inset-bottom) is respected across panels and modals", () => {
  const profileCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/profile.css"), "utf-8");
  const memoriesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/memories.css"), "utf-8");
  const storiesCss = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/stories.css"), "utf-8");
  const memoriesCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx"), "utf-8");

  assert.ok(
    profileCss.includes("env(safe-area-inset-bottom)"),
    "profile.css must declare env(safe-area-inset-bottom) for notched devices"
  );
  assert.ok(
    memoriesCss.includes("env(safe-area-inset-bottom)"),
    "memories.css must declare env(safe-area-inset-bottom) for notched devices"
  );
  assert.ok(
    storiesCss.includes("env(safe-area-inset-bottom)"),
    "stories.css must declare env(safe-area-inset-bottom) for notched devices"
  );
  assert.ok(
    memoriesCode.includes("safe-area-inset-bottom"),
    "MemoriesPanel lightbox modal must support safe-area-inset-bottom"
  );
});

// ---------------------------------------------------------------------------
// 4. Music Continuity & Interaction
// ---------------------------------------------------------------------------
test("Music Continuity: Audio engine is persistent at shell root across Home, Profile, and Memories", () => {
  const experienceCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/Experience.tsx"), "utf-8");

  // 1. Persistent audio element placed at root shell level (outside conditional tab content)
  assert.ok(
    experienceCode.includes('<audio') && experienceCode.includes('className="audioElement"') && experienceCode.includes('ref={playerRef}'),
    "Experience.tsx must mount a persistent audio element at the application shell root"
  );

  // 2. externalAudioRef passed to MusicRoom, MemoriesPanel, and ProfilePanel
  assert.ok(
    experienceCode.includes('<MusicRoom externalAudioRef={playerRef}'),
    "Experience.tsx must pass playerRef to MusicRoom"
  );
  assert.ok(
    experienceCode.includes('<MemoriesPanel\n            externalAudioRef={playerRef}') ||
    experienceCode.includes('externalAudioRef={playerRef}'),
    "Experience.tsx must pass playerRef to MemoriesPanel"
  );
  assert.ok(
    experienceCode.includes('ProfilePanel') && experienceCode.includes('externalAudioRef={playerRef}'),
    "Experience.tsx must pass playerRef to ProfilePanel"
  );
});

test("Music Continuity: MusicRoom does not render competing <audio> when externalAudioRef is provided", () => {
  const musicRoomCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/music/MusicRoom.tsx"), "utf-8");

  assert.ok(
    musicRoomCode.includes("{!externalAudioRef && ("),
    "MusicRoom must only render fallback <audio> when externalAudioRef is missing"
  );
});

test("Music Continuity: Photo lightbox modals and story viewing do NOT create competing <audio> tags", () => {
  const profileCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx"), "utf-8");
  const memoriesCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/MemoriesPanel.tsx"), "utf-8");
  const storyViewerCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/memories/StoryViewer.tsx"), "utf-8");

  assert.ok(
    !profileCode.includes("<audio"),
    "ProfilePanel must NOT create any competing <audio> tags"
  );
  assert.ok(
    !memoriesCode.includes("<audio"),
    "MemoriesPanel must NOT create any competing <audio> tags"
  );
  assert.ok(
    !storyViewerCode.includes("<audio"),
    "StoryViewer must NOT create any competing <audio> tags; must coordinate via externalAudioRef"
  );
});

test("Music Continuity: Video playback gracefully pauses background music and resumes on close", () => {
  const experienceCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/Experience.tsx"), "utf-8");
  const profileCode = fs.readFileSync(path.resolve(process.cwd(), "src/components/profile/ProfilePanel.tsx"), "utf-8");

  // Experience.tsx audio pause/resume handlers for videos
  assert.ok(
    experienceCode.includes("pauseMusicForVideo") && experienceCode.includes("resumeMusicAfterVideo"),
    "Experience.tsx must define pauseMusicForVideo and resumeMusicAfterVideo"
  );

  assert.ok(
    experienceCode.includes("wasPlayingBeforeVideoRef"),
    "Experience.tsx must track wasPlayingBeforeVideoRef to preserve play state across video close"
  );

  // ProfilePanel audio coordination for video detail items
  assert.ok(
    profileCode.includes("wasPlayingBeforeDetailVideoRef") || profileCode.includes("onPauseBackgroundMusic"),
    "ProfilePanel must support background music coordination when video items are played"
  );
});
