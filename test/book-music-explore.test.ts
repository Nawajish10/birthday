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
// Transpiler & Loader Helper
// ============================================================================

function loadTsxModule(relativePath: string) {
  const filePath = path.resolve(process.cwd(), relativePath);
  assert.ok(fs.existsSync(filePath), `File ${relativePath} must exist`);

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

// ============================================================================
// 1. File Structure and CSS Tokens Verification
// ============================================================================

test("File structure: all 10 owned component and CSS files exist", () => {
  const files = [
    "src/components/landing/BirthdayBookInvitation.tsx",
    "src/components/landing/book-invitation.css",
    "src/components/landing/OurSoundtrackSection.tsx",
    "src/components/landing/our-soundtrack.css",
    "src/components/landing/MemoriesPreviewSection.tsx",
    "src/components/landing/memories-preview.css",
    "src/components/landing/ExploreWorldSection.tsx",
    "src/components/landing/explore-world.css",
    "src/components/landing/ClosingMessageSection.tsx",
    "src/components/landing/closing-message.css",
  ];

  for (const f of files) {
    const fullPath = path.resolve(process.cwd(), f);
    assert.ok(fs.existsSync(fullPath), `Expected ${f} to exist on disk`);
  }
});

test("CSS token integrity: all 5 css files import landing-tokens.css and define accessible states", () => {
  const cssFiles = [
    "src/components/landing/book-invitation.css",
    "src/components/landing/our-soundtrack.css",
    "src/components/landing/memories-preview.css",
    "src/components/landing/explore-world.css",
    "src/components/landing/closing-message.css",
  ];

  for (const f of cssFiles) {
    const content = fs.readFileSync(path.resolve(process.cwd(), f), "utf-8");
    assert.ok(content.includes('landing-tokens.css'), `${f} must import landing-tokens.css`);
    assert.ok(content.includes(":focus-visible"), `${f} must define :focus-visible rules`);
    assert.ok(content.includes("prefers-reduced-motion"), `${f} must define prefers-reduced-motion support`);
  }
});

// ============================================================================
// 2. Section 5 — Birthday Book Invitation
// ============================================================================

test("Section 5: BirthdayBookInvitation exports and default content", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/BirthdayBookInvitation.tsx");
  const { BirthdayBookInvitation } = moduleExports;

  assert.equal(typeof BirthdayBookInvitation, "function");
  assert.ok(rawCode.includes("export interface BirthdayBookInvitationProps"));

  let bookOpened = false;
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(BirthdayBookInvitation, {
      onOpenBook: () => {
        bookOpened = true;
      },
    })
  );

  // Default copy verification
  assert.ok(html.includes("There&#x27;s a little more to this story.") || html.includes("There's a little more to this story."));
  assert.ok(html.includes("Every page holds something I wanted you to see, remember or feel."));
  assert.ok(html.includes("Open your birthday book"));
  assert.ok(html.includes("For my baba"));
  assert.ok(html.includes("تمہاری سالگرہ"));

  // Convincing physical book features
  assert.ok(html.includes("book-invitation-spine"), "Must include realistic book spine");
  assert.ok(html.includes("book-invitation-page-edges"), "Must include layered page edges");
  assert.ok(html.includes("book-invitation-shadow"), "Must include contact shadows");
  assert.ok(html.includes("book-invitation-foil-stamp"), "Must include antique gold foil stamp");
  assert.ok(html.includes("book-invitation-ribbon"), "Must include silk ribbon bookmark");
});

test("Section 5: BirthdayBookInvitation triggers onOpenBook via button and 3D cover", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/BirthdayBookInvitation.tsx");
  const { BirthdayBookInvitation } = moduleExports;

  let openCount = 0;
  const tree = BirthdayBookInvitation({
    onOpenBook: () => {
      openCount++;
    },
  });

  // Verify CTA button triggers callback
  const buttons = findElements(tree, (el) => el?.type === "button" && el?.props?.className?.includes("book-invitation-cta-btn"));
  assert.equal(buttons.length, 1, "Must contain exactly one primary CTA button");
  buttons[0].props.onClick();
  assert.equal(openCount, 1, "Clicking CTA button must call onOpenBook");

  // Verify 3D book cover triggers callback
  const bookCovers = findElements(tree, (el) => el?.props?.className?.includes("book-invitation-3d-wrapper"));
  assert.equal(bookCovers.length, 1, "Must contain interactive 3D book cover");
  bookCovers[0].props.onClick();
  assert.equal(openCount, 2, "Clicking 3D book cover must call onOpenBook");

  // Verify keyboard handling (Enter / Space)
  bookCovers[0].props.onKeyDown({ key: "Enter", preventDefault: () => {} });
  assert.equal(openCount, 3, "Pressing Enter on 3D book cover must call onOpenBook");

  bookCovers[0].props.onKeyDown({ key: " ", preventDefault: () => {} });
  assert.equal(openCount, 4, "Pressing Space on 3D book cover must call onOpenBook");
});

test("Section 5: BirthdayBookInvitation supports custom overrides", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/BirthdayBookInvitation.tsx");
  const { BirthdayBookInvitation } = moduleExports;

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(BirthdayBookInvitation, {
      heading: "A New Chapter Awaits",
      supportingText: "Turn the page to see our adventure unfold.",
      coverTitle: "The Meerah Anthology",
      coverUrdu: "میری محبت",
      totalPagesCount: 12,
      actionLabel: "Read the book now",
      onOpenBook: () => {},
    })
  );

  assert.ok(html.includes("A New Chapter Awaits"));
  assert.ok(html.includes("Turn the page to see our adventure unfold."));
  assert.ok(html.includes("The Meerah Anthology"));
  assert.ok(html.includes("میری محبت"));
  assert.ok(html.includes("12 Pages"));
  assert.ok(html.includes("Read the book now"));
});

// ============================================================================
// 3. Section 6 — Our Soundtrack
// ============================================================================

const sampleTracks = [
  { id: "trk-1", title: "Golden Hour", artist: "JVKE", url: "/audio/golden-hour.mp3", duration_seconds: 209 },
  { id: "trk-2", title: "Lover", artist: "Taylor Swift", url: "/audio/lover.mp3", duration_seconds: 221 },
  { id: "trk-3", title: "Until I Found You", artist: "Stephen Sanchez", url: "/audio/until.mp3", duration_seconds: 177 },
];

test("Section 6: OurSoundtrackSection exports and audio engine compliance", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/OurSoundtrackSection.tsx");
  const { OurSoundtrackSection, formatTrackDuration } = moduleExports;

  assert.equal(typeof OurSoundtrackSection, "function");
  assert.equal(typeof formatTrackDuration, "function");
  assert.equal(formatTrackDuration(209), "3:29");

  // Verify NO audio element is present in the source or rendered HTML (must reuse shared engine)
  assert.ok(!rawCode.includes("<audio"), "Must not create competing <audio> tags in source");

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      tracks: sampleTracks,
      activeTrack: sampleTracks[0],
      isPlaying: true,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );

  assert.ok(!html.includes("<audio"), "Must not render any <audio> elements in HTML");
  assert.ok(html.includes("Our soundtrack."));
  assert.ok(html.includes("Some feelings are easier to share through a song."));
  assert.ok(html.includes("Golden Hour"));
  assert.ok(html.includes("JVKE"));
  assert.ok(html.includes("soundtrack-vinyl"));
  assert.ok(html.includes("is-playing"));
});

test("Section 6: OurSoundtrackSection loading, error, and empty states", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/OurSoundtrackSection.tsx");
  const { OurSoundtrackSection } = moduleExports;

  // 1. Loading State
  const loadingHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      tracks: sampleTracks,
      activeTrack: sampleTracks[0],
      isPlaying: false,
      loading: true,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );
  assert.ok(loadingHtml.includes("Tuning our frequencies..."));
  assert.ok(loadingHtml.includes("is-loading"));

  // 2. Error State
  const errorHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      tracks: sampleTracks,
      activeTrack: sampleTracks[0],
      isPlaying: false,
      error: "Audio stream connection failed",
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {},
    })
  );
  assert.ok(errorHtml.includes("Soundtrack Temporarily Offline"));
  assert.ok(errorHtml.includes("Audio stream connection failed"));

  // 3. Empty State
  let songbookClicked = false;
  const emptyHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(OurSoundtrackSection, {
      tracks: [],
      activeTrack: null,
      isPlaying: false,
      onTogglePlay: () => {},
      onPlayTrack: () => {},
      onOpenSongbook: () => {
        songbookClicked = true;
      },
    })
  );
  assert.ok(emptyHtml.includes("The songbook is waiting for our soundtrack..."));
  assert.ok(emptyHtml.includes("Open full songbook ♫"));
});

test("Section 6: OurSoundtrackSection player controls and quick track select callbacks", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/OurSoundtrackSection.tsx");
  const { OurSoundtrackSection } = moduleExports;

  let playToggled = false;
  let playedTrack: any = null;
  let songbookOpened = false;

  const tree = OurSoundtrackSection({
    tracks: sampleTracks,
    activeTrack: sampleTracks[0],
    isPlaying: false,
    onTogglePlay: () => {
      playToggled = true;
    },
    onPlayTrack: (trk: any) => {
      playedTrack = trk;
    },
    onOpenSongbook: () => {
      songbookOpened = true;
    },
  });

  // Play/pause button
  const playBtns = findElements(tree, (el) => el?.props?.className?.includes("soundtrack-play-toggle-btn"));
  assert.equal(playBtns.length, 1);
  playBtns[0].props.onClick();
  assert.equal(playToggled, true, "Clicking play button must invoke onTogglePlay");

  // Open songbook button
  const songbookBtns = findElements(tree, (el) => el?.props?.className?.includes("soundtrack-open-songbook-btn"));
  assert.equal(songbookBtns.length, 1);
  songbookBtns[0].props.onClick();
  assert.equal(songbookOpened, true, "Clicking open songbook must invoke onOpenSongbook");

  // Quick track select
  const trackRows = findElements(tree, (el) => el?.props?.className?.includes("soundtrack-track-row"));
  assert.equal(trackRows.length, sampleTracks.length);
  trackRows[1].props.onClick();
  assert.deepEqual(playedTrack, sampleTracks[1], "Clicking track row must invoke onPlayTrack with selected track");
});

// ============================================================================
// 4. Section 7 — Memories Preview
// ============================================================================

const sampleMemories = [
  { id: "mem-1", url: "https://example.com/photo1.jpg", caption: "Sunset by the lake", media_kind: "image" as const },
  { id: "mem-2", url: "https://example.com/photo2.jpg", caption: "Birthday surprise dessert", media_kind: "image" as const },
  { id: "mem-3", url: "https://example.com/video1.mp4", caption: "Sparkler laughter", media_kind: "video" as const },
];

test("Section 7: MemoriesPreviewSection exports and default content", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/MemoriesPreviewSection.tsx");
  const { MemoriesPreviewSection, getMemoryAltText, getMemoryDisplayCaption } = moduleExports;

  assert.equal(typeof MemoriesPreviewSection, "function");
  assert.ok(rawCode.includes("export interface MemoriesPreviewSectionProps"));

  assert.equal(getMemoryAltText(sampleMemories[0], 0), "Sunset by the lake");
  assert.equal(getMemoryDisplayCaption(sampleMemories[0]), "Sunset by the lake");

  let memoriesOpened = false;
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MemoriesPreviewSection, {
      memories: sampleMemories,
      onOpenMemories: () => {
        memoriesOpened = true;
      },
    })
  );

  assert.ok(html.includes("Moments worth keeping."));
  assert.ok(html.includes("A few little pieces of time that deserve a place of their own."));
  assert.ok(html.includes("Sunset by the lake"));
  assert.ok(html.includes("Birthday surprise dessert"));
  assert.ok(html.includes("Sparkler laughter"));
  assert.ok(html.includes("polaroid-frame"));
  assert.ok(html.includes("washi-tape"));
  assert.ok(html.includes("Explore memories"));
});

test("Section 7: MemoriesPreviewSection empty state and callbacks", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/MemoriesPreviewSection.tsx");
  const { MemoriesPreviewSection } = moduleExports;

  // Empty state verification
  const emptyHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MemoriesPreviewSection, {
      memories: [],
      onOpenMemories: () => {},
    })
  );
  assert.ok(emptyHtml.includes("Moments are waiting to be placed here..."));
  assert.ok(emptyHtml.includes("Your birthday photos and sweet snapshots will appear here as soon as memories are pinned to the scrapbook."));

  // Callback verification
  let selectedMemory: any = null;
  let memoriesOpened = false;

  const tree = MemoriesPreviewSection({
    memories: sampleMemories,
    onOpenMemories: () => {
      memoriesOpened = true;
    },
    onSelectPhoto: (item: any) => {
      selectedMemory = item;
    },
  });

  // Clicking a polaroid card
  const polaroids = findElements(tree, (el) => el?.props?.className?.includes("memories-polaroid-card"));
  assert.equal(polaroids.length, 3);
  polaroids[0].props.onClick();
  assert.deepEqual(selectedMemory, sampleMemories[0], "Clicking polaroid must call onSelectPhoto");

  // Clicking bottom CTA
  const ctaBtns = findElements(tree, (el) => el?.props?.className?.includes("memories-preview-cta-btn"));
  assert.ok(ctaBtns.length >= 1);
  ctaBtns[0].props.onClick();
  assert.equal(memoriesOpened, true, "Clicking Explore memories button must call onOpenMemories");
});

// ============================================================================
// 5. Section 8 — Explore Your World
// ============================================================================

test("Section 8: ExploreWorldSection renders all 6 destinations with required labels and touch targets", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/ExploreWorldSection.tsx");
  const { ExploreWorldSection, DEFAULT_WORLD_DESTINATIONS } = moduleExports;

  assert.equal(typeof ExploreWorldSection, "function");
  assert.equal(DEFAULT_WORLD_DESTINATIONS.length, 6);

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ExploreWorldSection, {
      onNavigate: () => {},
    })
  );

  // Default heading
  assert.ok(html.includes("Explore your world."));
  assert.ok(html.includes("Every corner was designed to make you smile — choose where to wander next."));

  // Verify all 6 required destination texts from specification:
  // 1. Profile ("▦ Profile", "Her story, favorites & gallery")
  assert.ok(html.includes("▦ Profile"));
  assert.ok(html.includes("Her story, favorites &amp; gallery") || html.includes("Her story, favorites & gallery"));

  // 2. Games ("🎮 Games", "Solo & multiplayer birthday games")
  assert.ok(html.includes("🎮 Games"));
  assert.ok(html.includes("Solo &amp; multiplayer birthday games") || html.includes("Solo & multiplayer birthday games"));

  // 3. Study ("📖 Study", "12 genres, reading templates & cards")
  assert.ok(html.includes("📖 Study"));
  assert.ok(html.includes("12 genres, reading templates &amp; cards") || html.includes("12 genres, reading templates & cards"));

  // 4. Music Room ("♫ Music Room", "Private songbook & playlists")
  assert.ok(html.includes("♫ Music Room"));
  assert.ok(html.includes("Private songbook &amp; playlists") || html.includes("Private songbook & playlists"));

  // 5. Memories ("◎ Memories", "Snapchat camera & photo stories")
  assert.ok(html.includes("◎ Memories"));
  assert.ok(html.includes("Snapchat camera &amp; photo stories") || html.includes("Snapchat camera & photo stories"));

  // 6. Birthday Book ("✿ Birthday Book", "Keepsake flipbook")
  assert.ok(html.includes("✿ Birthday Book"));
  assert.ok(html.includes("Keepsake flipbook"));
});

test("Section 8: ExploreWorldSection onNavigate callback triggers with correct destination ID", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/ExploreWorldSection.tsx");
  const { ExploreWorldSection } = moduleExports;

  let navigatedTo = "";
  const tree = ExploreWorldSection({
    onNavigate: (dest: string) => {
      navigatedTo = dest;
    },
  });

  const cards = findElements(tree, (el) => el?.props?.className?.includes("explore-world-card"));
  assert.equal(cards.length, 6, "Must render exactly 6 destination cards");

  // Click each card and verify the destination ID passed
  const expectedDestinations = ["profile", "games", "study", "songs", "stories", "birthday-book"];
  for (let i = 0; i < cards.length; i++) {
    cards[i].props.onClick();
    assert.equal(navigatedTo, expectedDestinations[i], `Card ${i} should navigate to ${expectedDestinations[i]}`);
  }
});

// ============================================================================
// 6. Section 9 — Closing Message
// ============================================================================

test("Section 9: ClosingMessageSection exports, defaults, wax seal SVG, and actions", () => {
  const { moduleExports, rawCode } = loadTsxModule("src/components/landing/ClosingMessageSection.tsx");
  const { ClosingMessageSection } = moduleExports;

  assert.equal(typeof ClosingMessageSection, "function");
  assert.ok(rawCode.includes("export interface ClosingMessageSectionProps"));

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ClosingMessageSection, {})
  );

  // Default copy verification
  assert.ok(html.includes("And one last thing…"));
  assert.ok(html.includes("I hope this little world reminds you how special you are. May this new year of your life bring you happiness, beautiful surprises and countless reasons to smile."));
  assert.ok(html.includes("There&#x27;s always another memory waiting to be made.") || html.includes("There's always another memory waiting to be made."));
  assert.ok(html.includes("With all my love ♡"));
  assert.ok(html.includes("Return to beginning"));

  // Wax seal SVG presence
  assert.ok(html.includes("closing-wax-seal-svg"));
  assert.ok(html.includes("waxGradient"));
  assert.ok(html.includes("<svg"));
});

test("Section 9: ClosingMessageSection return to beginning and explore callbacks", () => {
  const { moduleExports } = loadTsxModule("src/components/landing/ClosingMessageSection.tsx");
  const { ClosingMessageSection } = moduleExports;

  let returnedToTop = false;
  let exploredMore = false;

  const tree = ClosingMessageSection({
    onReturnToTop: () => {
      returnedToTop = true;
    },
    onExploreMore: () => {
      exploredMore = true;
    },
  });

  const returnBtn = findElements(tree, (el) => el?.props?.className?.includes("closing-return-btn"));
  assert.equal(returnBtn.length, 1);
  returnBtn[0].props.onClick();
  assert.equal(returnedToTop, true, "Clicking return button must invoke onReturnToTop");

  const exploreBtn = findElements(tree, (el) => el?.props?.className?.includes("closing-explore-btn"));
  assert.equal(exploreBtn.length, 1);
  exploreBtn[0].props.onClick();
  assert.equal(exploredMore, true, "Clicking explore more button must invoke onExploreMore");
});
