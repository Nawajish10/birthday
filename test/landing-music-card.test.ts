import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import ReactDOMServer from "react-dom/server";

const require = createRequire(import.meta.url);

// ============================================================================
// Component Loader & Tree Traversal Utilities
// ============================================================================

function loadLandingMusicCardModule() {
  const filePath = path.resolve(process.cwd(), "src/components/landing/LandingMusicCard.tsx");
  assert.ok(fs.existsSync(filePath), "LandingMusicCard.tsx must exist");

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

  return { moduleExports, rawCode };
}

function findElements(element: any, predicate: (el: any) => boolean): any[] {
  const results: any[] = [];
  if (!element || typeof element !== "object") return results;

  if (predicate(element)) {
    results.push(element);
  }

  if (element.props && element.props.children) {
    const children = Array.isArray(element.props.children)
      ? element.props.children
      : [element.props.children];
    for (const child of children) {
      results.push(...findElements(child, predicate));
    }
  }

  return results;
}

const mockTracks = [
  { id: "track-1", title: "Golden Hour", artist: "JVKE", url: "/music/track1.mp3" },
  { id: "track-2", title: "Lover", artist: "Taylor Swift", url: "/music/track2.mp3" },
  { id: "track-3", title: "Until I Found You", artist: "Stephen Sanchez", url: "/music/track3.mp3" },
];

// ============================================================================
// 1. Module Exports & Contract Verification
// ============================================================================

test("Component contract: LandingMusicCard.tsx exports required interfaces and component", () => {
  const { moduleExports, rawCode } = loadLandingMusicCardModule();
  assert.equal(typeof moduleExports.LandingMusicCard, "function");

  // Type exports check in source code
  assert.ok(rawCode.includes("export interface LandingMusicTrack"), "Must export LandingMusicTrack");
  assert.ok(rawCode.includes("export interface LandingMusicCardProps"), "Must export LandingMusicCardProps");
  assert.ok(rawCode.includes("export function LandingMusicCard"), "Must export LandingMusicCard function");
});

// ============================================================================
// 2. Empty State Tests
// ============================================================================

test("Empty state: renders charming fallback message when tracklist is empty or undefined", () => {
  const { moduleExports } = loadLandingMusicCardModule();
  const { LandingMusicCard } = moduleExports;

  let songbookOpened = false;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LandingMusicCard, {
      tracks: [],
      activeTrack: null,
      isPlaying: false,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {
        songbookOpened = true;
      },
    })
  );

  // Fallback text verification
  assert.ok(
    html.includes("The songbook is waiting for our soundtrack..."),
    "Should display the empty state waiting message"
  );
  assert.ok(html.includes("Open full songbook ♫"), "Should render open songbook button");
  assert.ok(html.includes("is-empty"), "Card container should have .is-empty class");

  // Verify callback invocation from element tree
  const tree = LandingMusicCard({
    tracks: [],
    activeTrack: null,
    isPlaying: false,
    onTogglePlay: () => {},
    onPlayTrack: () => {},
    onOpenSongbook: () => {
      songbookOpened = true;
    },
  });

  const buttons = findElements(tree, (el) => el?.type === "button");
  assert.equal(buttons.length, 1, "Empty state should have exactly 1 button for songbook");
  buttons[0].props.onClick();
  assert.equal(songbookOpened, true, "Clicking empty state button should call onOpenSongbook");
});

// ============================================================================
// 3. Playing vs Paused State Rendering
// ============================================================================

test("Playing vs paused state: renders correct classes, labels, and animations", () => {
  const { moduleExports } = loadLandingMusicCardModule();
  const { LandingMusicCard } = moduleExports;

  // 1. Paused state
  const pausedHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LandingMusicCard, {
      tracks: mockTracks,
      activeTrack: mockTracks[0],
      isPlaying: false,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );

  assert.ok(pausedHtml.includes("is-paused"), "Paused state should contain .is-paused");
  assert.ok(!pausedHtml.includes("is-spinning"), "Paused state vinyl should NOT spin");
  assert.ok(!pausedHtml.includes("is-engaged"), "Paused tonearm should not be engaged");
  assert.ok(pausedHtml.includes("Play Golden Hour"), "Aria label should prompt to Play");
  assert.ok(pausedHtml.includes("Paused"), "Status indicator should say Paused");

  // 2. Playing state
  const playingHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LandingMusicCard, {
      tracks: mockTracks,
      activeTrack: mockTracks[0],
      isPlaying: true,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );

  assert.ok(playingHtml.includes("is-playing"), "Playing state should contain .is-playing");
  assert.ok(playingHtml.includes("is-spinning"), "Playing vinyl should contain .is-spinning");
  assert.ok(playingHtml.includes("is-engaged"), "Playing tonearm should be engaged");
  assert.ok(playingHtml.includes("Pause Golden Hour"), "Aria label should prompt to Pause");
  assert.ok(playingHtml.includes("Now Playing"), "Status indicator should say Now Playing");
});

// ============================================================================
// 4. Callback Invocations (Play/Pause, Track Selection, Songbook)
// ============================================================================

test("Callback invocations: play/pause toggle, track selection, and full songbook trigger", () => {
  const { moduleExports } = loadLandingMusicCardModule();
  const { LandingMusicCard } = moduleExports;

  let togglePlayCalled = 0;
  let playedTrack: any = null;
  let openSongbookCalled = 0;

  const tree = LandingMusicCard({
    tracks: mockTracks,
    activeTrack: mockTracks[0],
    isPlaying: false,
    onTogglePlay: () => {
      togglePlayCalled++;
    },
    onPlayTrack: (track: any) => {
      playedTrack = track;
    },
    onOpenSongbook: () => {
      openSongbookCalled++;
    },
  });

  const buttons = findElements(tree, (el) => el?.type === "button");

  // 1. Play/Pause button
  const playPauseBtn = buttons.find((b) =>
    b.props.className?.includes("scrapbook-play-toggle-btn")
  );
  assert.ok(playPauseBtn, "Must find scrapbook-play-toggle-btn");
  playPauseBtn.props.onClick();
  assert.equal(togglePlayCalled, 1, "Clicking play/pause toggle should call onTogglePlay");

  // 2. Tracklist selection
  const trackButtons = buttons.filter((b) =>
    b.props.className?.includes("scrapbook-tracklist-item")
  );
  assert.equal(trackButtons.length, 3, "Must render 3 tracklist item buttons");

  // Clicking an inactive track should call onPlayTrack with that track
  trackButtons[1].props.onClick();
  assert.deepEqual(
    playedTrack,
    mockTracks[1],
    "Clicking track 2 should call onPlayTrack(mockTracks[1])"
  );

  // Clicking the currently active track should toggle play
  trackButtons[0].props.onClick();
  assert.equal(
    togglePlayCalled,
    2,
    "Clicking the already-active track should toggle play/pause state"
  );

  // 3. Open songbook button
  const songbookBtn = buttons.find((b) =>
    b.props.className?.includes("scrapbook-music-btn-songbook")
  );
  assert.ok(songbookBtn, "Must find scrapbook-music-btn-songbook");
  songbookBtn.props.onClick();
  assert.equal(openSongbookCalled, 1, "Clicking songbook button should call onOpenSongbook");
});

// ============================================================================
// 5. Accessibility & Button Labeling
// ============================================================================

test("Accessibility: all interactive buttons have explicit aria-label and no nested buttons exist", () => {
  const { moduleExports, rawCode } = loadLandingMusicCardModule();
  const { LandingMusicCard } = moduleExports;

  const tree = LandingMusicCard({
    tracks: mockTracks,
    activeTrack: mockTracks[0],
    isPlaying: true,
    onTogglePlay: () => {},
    onPlayTrack: () => {},
    onOpenSongbook: () => {},
  });

  const buttons = findElements(tree, (el) => el?.type === "button");
  assert.ok(buttons.length >= 5, "Should have at least 5 buttons (play, 3 tracks, songbook)");

  for (const btn of buttons) {
    const ariaLabel = btn.props["aria-label"];
    assert.ok(
      typeof ariaLabel === "string" && ariaLabel.trim().length > 0,
      `Every button must have a non-empty aria-label. Found: ${JSON.stringify(btn.props)}`
    );
  }

  // Ensure no nested buttons
  const buttonTags = rawCode.match(/<button[\s\S]*?<\/button>/g) || [];
  for (const b of buttonTags) {
    const innerButtons = (b.match(/<button/g) || []).length;
    assert.equal(innerButtons, 1, `Found invalid nested <button> tag: ${b.slice(0, 80)}...`);
  }
});

// ============================================================================
// 6. Personal Note Customization
// ============================================================================

test("Personal note: renders customized note or defaults to standard romantic note", () => {
  const { moduleExports } = loadLandingMusicCardModule();
  const { LandingMusicCard } = moduleExports;

  // Custom note
  const customHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LandingMusicCard, {
      tracks: mockTracks,
      activeTrack: mockTracks[0],
      isPlaying: false,
      personalNote: "Every melody reminds me of your smile.",
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );
  assert.ok(customHtml.includes("Every melody reminds me of your smile."));

  // Default note
  const defaultHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(LandingMusicCard, {
      tracks: mockTracks,
      activeTrack: mockTracks[0],
      isPlaying: false,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );
  assert.ok(
    defaultHtml.includes("A song for every memory we&#x27;ve made so far...") ||
      defaultHtml.includes("A song for every memory we've made so far...")
  );
});

// ============================================================================
// 7. Stylesheet & Scrapbook Design Token Verification
// ============================================================================

test("CSS verification: landing-music-card.css defines vinyl styles, tokens, and reduced-motion", () => {
  const cssPath = path.resolve(process.cwd(), "src/components/landing/landing-music-card.css");
  assert.ok(fs.existsSync(cssPath), "landing-music-card.css must exist");

  const css = fs.readFileSync(cssPath, "utf-8");

  // Essential selectors
  assert.ok(css.includes(".scrapbook-music-card"), "Must define .scrapbook-music-card");
  assert.ok(css.includes(".scrapbook-vinyl-disc"), "Must define .scrapbook-vinyl-disc");
  assert.ok(css.includes(".scrapbook-vinyl-disc.is-spinning"), "Must define .scrapbook-vinyl-disc.is-spinning");
  assert.ok(css.includes(".scrapbook-tonearm"), "Must define .scrapbook-tonearm");
  assert.ok(css.includes(".scrapbook-tracklist-item"), "Must define .scrapbook-tracklist-item");
  assert.ok(css.includes(".scrapbook-music-btn-songbook"), "Must define .scrapbook-music-btn-songbook");
  assert.ok(css.includes(".scrapbook-music-card.is-empty"), "Must define empty state .is-empty");

  // Token usages
  assert.ok(css.includes("--scrapbook-rose"), "Must reference scrapbook rose tokens");
  assert.ok(css.includes("--scrapbook-sunflower"), "Must reference scrapbook sunflower tokens");
  assert.ok(css.includes("--scrapbook-border"), "Must reference scrapbook border tokens");

  // Keyframes
  assert.ok(css.includes("@keyframes vinyl-spin"), "Must define @keyframes vinyl-spin");

  // Accessibility: prefers-reduced-motion
  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "Must include @media (prefers-reduced-motion: reduce) to disable vinyl spinning animation"
  );
});
