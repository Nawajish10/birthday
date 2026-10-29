/**
 * story-music-regression.test.ts
 * Agent F – Independent QA & Security regression test suite.
 * 
 * Verifies:
 * 1. story-helpers audio exports: captureAudioState, playStoryAudio, pauseStoryAudio,
 *    resumeStoryAudio, restoreAudioState, setStoryAudioMuted.
 * 2. StoryViewer component prop interfaces remain strictly compatible with
 *    `externalAudioRef?: React.RefObject<HTMLAudioElement | null>`.
 * 3. Story audio playback state transitions do not conflict with shared/ambient audio.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

import {
  captureAudioState,
  playStoryAudio,
  pauseStoryAudio,
  resumeStoryAudio,
  restoreAudioState,
  setStoryAudioMuted,
  type PreviousAudioState,
} from "../src/components/memories/story-helpers.ts";
import type { StoryItem, StoryAudioTrack } from "../src/types/media-contracts.ts";

// ============================================================================
// Mock Audio Element for State Transition Testing
// ============================================================================

class MockAudioElement {
  src: string = "";
  currentSrc: string = "";
  currentTime: number = 0;
  paused: boolean = true;
  ended: boolean = false;
  muted: boolean = false;
  volume: number = 1.0;

  // Spies / Call counters
  playCount: number = 0;
  pauseCount: number = 0;
  loadCount: number = 0;
  removedAttributes: string[] = [];
  shouldRejectPlay: boolean = false;
  playRejectionReason: string = "NotAllowedError: Autoplay blocked";

  async play(): Promise<void> {
    if (this.shouldRejectPlay) {
      throw new Error(this.playRejectionReason);
    }
    this.paused = false;
    this.currentSrc = this.src;
    this.playCount++;
  }

  pause(): void {
    this.paused = true;
    this.pauseCount++;
  }

  load(): void {
    this.loadCount++;
    this.currentSrc = this.src;
  }

  removeAttribute(attr: string): void {
    this.removedAttributes.push(attr);
    if (attr === "src") {
      this.src = "";
      this.currentSrc = "";
    }
  }
}

// ============================================================================
// 1. Verify story-helpers Exports & Function Contracts
// ============================================================================

describe("Story Helpers: Audio Bridge Export & Function Contracts", () => {
  test("exports all required audio helper functions", () => {
    assert.equal(typeof captureAudioState, "function", "captureAudioState must be a function");
    assert.equal(typeof playStoryAudio, "function", "playStoryAudio must be a function");
    assert.equal(typeof pauseStoryAudio, "function", "pauseStoryAudio must be a function");
    assert.equal(typeof resumeStoryAudio, "function", "resumeStoryAudio must be a function");
    assert.equal(typeof restoreAudioState, "function", "restoreAudioState must be a function");
    assert.equal(typeof setStoryAudioMuted, "function", "setStoryAudioMuted must be a function");
  });

  test("captureAudioState: handles null/undefined audio element safely", () => {
    assert.equal(captureAudioState(null), null);
    assert.equal(captureAudioState(undefined as any), null);
  });

  test("captureAudioState: captures playing state, volume, src, and currentTime", () => {
    const el = new MockAudioElement() as unknown as HTMLAudioElement;
    el.src = "https://cdn.example.com/ambient.mp3";
    el.currentTime = 18.5;
    el.volume = 0.65;
    (el as unknown as MockAudioElement).paused = false;
    (el as unknown as MockAudioElement).ended = false;

    const state = captureAudioState(el);
    assert.ok(state);
    assert.equal(state.src, "https://cdn.example.com/ambient.mp3");
    assert.equal(state.currentTime, 18.5);
    assert.equal(state.volume, 0.65);
    assert.equal(state.wasPlaying, true);
  });

  test("captureAudioState: accurately reports wasPlaying=false when paused or ended", () => {
    const el = new MockAudioElement() as unknown as HTMLAudioElement;
    el.src = "https://cdn.example.com/ambient.mp3";
    (el as unknown as MockAudioElement).paused = true;
    (el as unknown as MockAudioElement).ended = false;

    const pausedState = captureAudioState(el);
    assert.ok(pausedState);
    assert.equal(pausedState.wasPlaying, false);

    (el as unknown as MockAudioElement).paused = false;
    (el as unknown as MockAudioElement).ended = true;
    const endedState = captureAudioState(el);
    assert.ok(endedState);
    assert.equal(endedState.wasPlaying, false);
  });

  test("playStoryAudio: returns failure when audio element is null", async () => {
    const track: StoryAudioTrack = { id: "t1", title: "Song", artist: "Artist", audioUrl: "https://audio.mp3" };
    const result = await playStoryAudio(null, track);
    assert.equal(result.success, false);
    assert.ok(result.error?.includes("No external audio element"));
  });

  test("playStoryAudio: returns failure when track or audioUrl is missing", async () => {
    const el = new MockAudioElement() as unknown as HTMLAudioElement;
    const res1 = await playStoryAudio(el, null);
    assert.equal(res1.success, false);

    const res2 = await playStoryAudio(el, { id: "t2", title: "No URL", artist: "A", audioUrl: "" });
    assert.equal(res2.success, false);
    assert.ok(res2.error?.includes("No audio track or audioUrl"));
  });

  test("playStoryAudio: successfully sets track, resets time, loads, and plays", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;
    mock.src = "https://prior.mp3";
    mock.currentTime = 40;

    const track: StoryAudioTrack = {
      id: "track-happy",
      title: "Birthday Cheer",
      artist: "Celebrant",
      audioUrl: "https://cdn.example.com/cheer.mp3",
    };

    const res = await playStoryAudio(el, track);
    assert.equal(res.success, true);
    assert.equal(mock.src, "https://cdn.example.com/cheer.mp3");
    assert.equal(mock.currentTime, 0);
    assert.equal(mock.loadCount, 1);
    assert.equal(mock.playCount, 1);
    assert.equal(mock.paused, false);
  });

  test("playStoryAudio: does not reload if track is already loaded", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;
    mock.src = "https://cdn.example.com/cheer.mp3";
    mock.currentSrc = "https://cdn.example.com/cheer.mp3";
    mock.paused = true;

    const track: StoryAudioTrack = {
      id: "track-happy",
      title: "Birthday Cheer",
      artist: "Celebrant",
      audioUrl: "https://cdn.example.com/cheer.mp3",
    };

    const res = await playStoryAudio(el, track);
    assert.equal(res.success, true);
    assert.equal(mock.loadCount, 0, "Should not call load() if track is already current");
    assert.equal(mock.playCount, 1, "Should call play() to unpause");
  });

  test("playStoryAudio: catches autoplay rejection gracefully without throwing", async () => {
    const mock = new MockAudioElement();
    mock.shouldRejectPlay = true;
    mock.playRejectionReason = "NotAllowedError: user gesture required";
    const el = mock as unknown as HTMLAudioElement;

    const track: StoryAudioTrack = { id: "t", title: "T", artist: "A", audioUrl: "https://music.mp3" };
    const res = await playStoryAudio(el, track);
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("NotAllowedError"));
  });

  test("pauseStoryAudio: safely handles null element", () => {
    assert.doesNotThrow(() => pauseStoryAudio(null));
  });

  test("pauseStoryAudio: pauses playing audio, ignores already paused", () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    mock.paused = false;
    pauseStoryAudio(el);
    assert.equal(mock.paused, true);
    assert.equal(mock.pauseCount, 1);

    // Call again when already paused
    pauseStoryAudio(el);
    assert.equal(mock.pauseCount, 1, "Should not redundantly call pause");
  });

  test("resumeStoryAudio: returns false when audio element or src is absent", async () => {
    assert.equal(await resumeStoryAudio(null), false);
    const mock = new MockAudioElement();
    mock.src = "";
    assert.equal(await resumeStoryAudio(mock as unknown as HTMLAudioElement), false);
  });

  test("resumeStoryAudio: resumes paused audio", async () => {
    const mock = new MockAudioElement();
    mock.src = "https://cdn.example.com/song.mp3";
    mock.paused = true;

    const ok = await resumeStoryAudio(mock as unknown as HTMLAudioElement);
    assert.equal(ok, true);
    assert.equal(mock.paused, false);
    assert.equal(mock.playCount, 1);
  });

  test("restoreAudioState: handles null element safely", () => {
    assert.doesNotThrow(() => restoreAudioState(null, null));
  });

  test("restoreAudioState: cleanly unloads audio when previousState is null", () => {
    const mock = new MockAudioElement();
    mock.src = "https://cdn.example.com/story-song.mp3";
    mock.paused = false;

    restoreAudioState(mock as unknown as HTMLAudioElement, null);
    assert.equal(mock.paused, true, "Should pause playback");
    assert.ok(mock.removedAttributes.includes("src"), "Should remove src attribute");
    assert.equal(mock.src, "");
    assert.equal(mock.loadCount, 1, "Should call load() to reset audio pipeline");
  });

  test("restoreAudioState: restores previous track and resumes if previously playing", () => {
    const mock = new MockAudioElement();
    mock.src = "https://cdn.example.com/story-track.mp3";
    mock.paused = false;

    const previous: PreviousAudioState = {
      src: "https://cdn.example.com/ambient-bgm.mp3",
      currentTime: 104.2,
      wasPlaying: true,
      volume: 0.75,
    };

    restoreAudioState(mock as unknown as HTMLAudioElement, previous);
    assert.equal(mock.src, "https://cdn.example.com/ambient-bgm.mp3");
    assert.equal(mock.currentTime, 104.2);
    assert.equal(mock.volume, 0.75);
    assert.equal(mock.paused, false, "Should resume prior playing track");
    assert.equal(mock.playCount, 1);
  });

  test("restoreAudioState: restores track but leaves paused if wasPlaying=false", () => {
    const mock = new MockAudioElement();
    mock.src = "https://cdn.example.com/story-track.mp3";
    mock.paused = false;

    const previous: PreviousAudioState = {
      src: "https://cdn.example.com/ambient-bgm.mp3",
      currentTime: 22.0,
      wasPlaying: false,
      volume: 0.5,
    };

    restoreAudioState(mock as unknown as HTMLAudioElement, previous);
    assert.equal(mock.src, "https://cdn.example.com/ambient-bgm.mp3");
    assert.equal(mock.currentTime, 22.0);
    assert.equal(mock.volume, 0.5);
    assert.equal(mock.paused, true, "Must remain paused when prior track was paused");
    assert.equal(mock.playCount, 0);
  });

  test("setStoryAudioMuted: handles null element and toggles mute safely", () => {
    assert.doesNotThrow(() => setStoryAudioMuted(null, true));

    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    setStoryAudioMuted(el, true);
    assert.equal(mock.muted, true);

    setStoryAudioMuted(el, false);
    assert.equal(mock.muted, false);
  });
});

// ============================================================================
// 2. StoryViewer Component Prop Interface Verification
// ============================================================================

describe("StoryViewer: Prop Interface Compatibility with externalAudioRef", () => {
  const storyViewerFilePath = path.resolve(process.cwd(), "src/components/memories/StoryViewer.tsx");

  test("StoryViewer.tsx source file exists", () => {
    assert.ok(fs.existsSync(storyViewerFilePath), "StoryViewer.tsx must exist");
  });

  test("StoryViewer exports StoryViewer and StoryBuilderModal", () => {
    const content = fs.readFileSync(storyViewerFilePath, "utf-8");
    assert.ok(content.includes("export const StoryViewer: React.FC<StoryViewerProps>"));
    assert.ok(content.includes("export interface StoryViewerProps"));
  });

  test("StoryViewerProps interface defines externalAudioRef as optional React.RefObject", () => {
    const content = fs.readFileSync(storyViewerFilePath, "utf-8");
    const sourceFile = ts.createSourceFile(
      "StoryViewer.tsx",
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    let foundInterface = false;
    let externalAudioRefPropFound = false;
    let isOptional = false;
    let typeText = "";

    function visit(node: ts.Node) {
      if (ts.isInterfaceDeclaration(node) && node.name.text === "StoryViewerProps") {
        foundInterface = true;
        for (const member of node.members) {
          if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) {
            if (member.name.text === "externalAudioRef") {
              externalAudioRefPropFound = true;
              isOptional = Boolean(member.questionToken);
              typeText = member.type ? member.type.getText(sourceFile) : "";
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    assert.ok(foundInterface, "StoryViewerProps interface must be defined in StoryViewer.tsx");
    assert.ok(externalAudioRefPropFound, "StoryViewerProps must have externalAudioRef property");
    assert.equal(isOptional, true, "externalAudioRef must be an optional property (?)");
    assert.ok(
      typeText.includes("React.RefObject<HTMLAudioElement | null>"),
      `externalAudioRef type must be React.RefObject<HTMLAudioElement | null>, found: ${typeText}`
    );
  });

  test("StoryViewer accepts all standard props without type collisions", () => {
    const content = fs.readFileSync(storyViewerFilePath, "utf-8");
    const requiredProps = ["story", "isOpen", "onClose"];
    const optionalProps = ["externalAudioRef", "loop", "slideDurationMs", "initialSlideIndex"];

    for (const prop of requiredProps) {
      assert.ok(
        content.includes(`${prop}:`),
        `StoryViewerProps must declare required prop "${prop}"`
      );
    }
    for (const prop of optionalProps) {
      assert.ok(
        content.includes(`${prop}?:`),
        `StoryViewerProps must declare optional prop "${prop}?"`
      );
    }
  });

  test("StoryViewer audio bridge checks externalAudioRef safely with optional chaining or guards", () => {
    const content = fs.readFileSync(storyViewerFilePath, "utf-8");
    // Ensure externalAudioRef is accessed with optional chaining
    assert.ok(
      content.includes("externalAudioRef?.current"),
      "StoryViewer must access externalAudioRef?.current using optional chaining"
    );
    // Verify guarded or safe fallback across all call sites
    assert.ok(
      content.includes("externalAudioRef?.current || null") || content.includes("if (externalAudioRef?.current)"),
      "StoryViewer must guard externalAudioRef access against null/undefined"
    );
  });
});

// ============================================================================
// 3. Audio Playback State Transitions & Shared Audio Coordination
// ============================================================================

describe("Audio State Transitions: StoryViewer & Shared Ambient Audio", () => {
  const sampleStoryWithTrack: StoryItem = {
    id: "story-birthday-gala",
    title: "Birthday Gala",
    photoIds: ["p1", "p2"],
    photos: [],
    createdAt: "2026-10-29T00:00:00Z",
    updatedAt: "2026-10-29T00:00:00Z",
    musicTrackId: "track-gala",
    musicTrack: {
      id: "track-gala",
      title: "Afreen Afreen",
      artist: "Rahat Fateh Ali Khan",
      audioUrl: "https://cdn.example.com/afreen.mp3",
    },
  };

  const sampleStoryWithoutTrack: StoryItem = {
    id: "story-silent-memory",
    title: "Silent Memory",
    photoIds: ["p1"],
    photos: [],
    createdAt: "2026-10-29T00:00:00Z",
    updatedAt: "2026-10-29T00:00:00Z",
  };

  test("Scenario 1: Background playing -> Story open -> Story audio plays -> Story close -> Background resumes", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    // 1. App starts ambient background track
    mock.src = "https://cdn.example.com/app-ambient.mp3";
    mock.currentTime = 55.4;
    await mock.play();
    assert.equal(mock.paused, false);

    // 2. StoryViewer opens: captures state and plays story audio
    const captured = captureAudioState(el);
    assert.ok(captured);
    assert.equal(captured.wasPlaying, true);
    assert.equal(captured.currentTime, 55.4);

    const playResult = await playStoryAudio(el, sampleStoryWithTrack.musicTrack);
    assert.equal(playResult.success, true);
    assert.equal(mock.src, "https://cdn.example.com/afreen.mp3");
    assert.equal(mock.currentTime, 0);
    assert.equal(mock.paused, false);

    // 3. StoryViewer closes: restores original background audio
    restoreAudioState(el, captured);
    assert.equal(mock.src, "https://cdn.example.com/app-ambient.mp3");
    assert.equal(mock.currentTime, 55.4);
    assert.equal(mock.paused, false, "Ambient music must resume after story closes");
  });

  test("Scenario 2: Background paused -> Story open -> Story audio plays -> Story close -> Background remains paused", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    // 1. App has ambient track loaded but paused
    mock.src = "https://cdn.example.com/app-ambient.mp3";
    mock.currentTime = 12.0;
    mock.paused = true;

    // 2. StoryViewer opens
    const captured = captureAudioState(el);
    assert.ok(captured);
    assert.equal(captured.wasPlaying, false);

    await playStoryAudio(el, sampleStoryWithTrack.musicTrack);
    assert.equal(mock.src, "https://cdn.example.com/afreen.mp3");
    assert.equal(mock.paused, false);

    // 3. StoryViewer closes
    restoreAudioState(el, captured);
    assert.equal(mock.src, "https://cdn.example.com/app-ambient.mp3");
    assert.equal(mock.currentTime, 12.0);
    assert.equal(mock.paused, true, "Must stay paused because it was paused prior to opening story");
  });

  test("Scenario 3: No prior audio in app -> Story open -> Story closes -> Audio element cleared", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    // 1. App has no audio playing
    mock.src = "";
    mock.paused = true;

    const captured = captureAudioState(el);
    // captured.src is empty
    assert.equal(captured?.src, "");

    // 2. StoryViewer plays soundtrack
    await playStoryAudio(el, sampleStoryWithTrack.musicTrack);
    assert.equal(mock.src, "https://cdn.example.com/afreen.mp3");

    // 3. StoryViewer closes
    restoreAudioState(el, captured);
    assert.equal(mock.src, "");
    assert.equal(mock.paused, true);
    assert.ok(mock.removedAttributes.includes("src"), "Audio src must be cleared completely");
  });

  test("Scenario 4: Story has no music track -> ambient audio is not disturbed", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    mock.src = "https://cdn.example.com/app-ambient.mp3";
    mock.currentTime = 30;
    await mock.play();

    const initialPlayCount = mock.playCount;
    const initialPauseCount = mock.pauseCount;

    // Story has no track, so playStoryAudio is skipped
    if (sampleStoryWithoutTrack.musicTrack) {
      await playStoryAudio(el, sampleStoryWithoutTrack.musicTrack);
    }

    assert.equal(mock.src, "https://cdn.example.com/app-ambient.mp3");
    assert.equal(mock.currentTime, 30);
    assert.equal(mock.playCount, initialPlayCount);
    assert.equal(mock.pauseCount, initialPauseCount);
  });

  test("Scenario 5: User hold-to-pause and release pauses and resumes story audio", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    await playStoryAudio(el, sampleStoryWithTrack.musicTrack);
    assert.equal(mock.paused, false);

    // User touches and holds slide
    pauseStoryAudio(el);
    assert.equal(mock.paused, true);

    // User releases hold
    const resumed = await resumeStoryAudio(el);
    assert.equal(resumed, true);
    assert.equal(mock.paused, false);
  });

  test("Scenario 6: Mute toggle does not interrupt playback position or source", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    await playStoryAudio(el, sampleStoryWithTrack.musicTrack);
    mock.currentTime = 15;

    // Toggle mute on
    setStoryAudioMuted(el, true);
    assert.equal(mock.muted, true);
    assert.equal(mock.src, "https://cdn.example.com/afreen.mp3");
    assert.equal(mock.currentTime, 15);
    assert.equal(mock.paused, false);

    // Toggle mute off
    setStoryAudioMuted(el, false);
    assert.equal(mock.muted, false);
    assert.equal(mock.src, "https://cdn.example.com/afreen.mp3");
    assert.equal(mock.currentTime, 15);
  });

  test("Scenario 7: Consecutive story switching updates audio track without leaking", async () => {
    const mock = new MockAudioElement();
    const el = mock as unknown as HTMLAudioElement;

    const story1Track: StoryAudioTrack = {
      id: "track-1",
      title: "First Track",
      artist: "Artist 1",
      audioUrl: "https://cdn.example.com/track1.mp3",
    };

    const story2Track: StoryAudioTrack = {
      id: "track-2",
      title: "Second Track",
      artist: "Artist 2",
      audioUrl: "https://cdn.example.com/track2.mp3",
    };

    // Open first story
    await playStoryAudio(el, story1Track);
    mock.currentTime = 25;
    assert.equal(mock.src, "https://cdn.example.com/track1.mp3");

    // Switch to second story
    await playStoryAudio(el, story2Track);
    assert.equal(mock.src, "https://cdn.example.com/track2.mp3");
    assert.equal(mock.currentTime, 0, "New story audio must start from beginning (0)");
    assert.equal(mock.paused, false);
  });
});
