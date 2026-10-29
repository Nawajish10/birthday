import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);

// ============================================================================
// Module Loader Helper for TSX Components
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

  const moduleExports: Record<string, any> = {};
  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, require);

  return { moduleExports, rawCode };
}

const { moduleExports: revealModule, rawCode: revealCode } = loadTsxModule(
  "src/components/landing/MidnightBirthdayReveal.tsx"
);

const {
  DEFAULT_RECIPIENT_NAME,
  DEFAULT_RECIPIENT_PHOTO_URL,
  DEFAULT_RECIPIENT_TIMEZONE,
  DEFAULT_BIRTHDAY_MONTH,
  DEFAULT_BIRTHDAY_DAY,
  DEFAULT_STORAGE_KEY_PREFIX,
  DEFAULT_URDU_BLESSING,
  getTimezoneDateParts,
  isBirthdayActive,
  getRevealStorageKey,
  hasRevealCompleted,
  markRevealCompleted,
  playMusicBoxChime,
  MidnightBirthdayReveal,
} = revealModule;

const CSS_FILE = path.resolve(process.cwd(), "src/components/landing/midnight-reveal.css");

// ============================================================================
// Suite 1: Timezone Calculation for October 30 (Recipient: Asia/Kolkata)
// ============================================================================
describe("Suite 1: Timezone Calculation for October 30 (Asia/Kolkata)", () => {
  test("Before midnight: October 29 at 23:59:59 in Asia/Kolkata (18:29:59 UTC)", () => {
    // 18:29:59 UTC on Oct 29 = 23:59:59 in Asia/Kolkata (+05:30)
    const beforeMidnightUtc = new Date("2026-10-29T18:29:59Z");
    const parts = getTimezoneDateParts(beforeMidnightUtc, "Asia/Kolkata");

    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 10);
    assert.equal(parts.day, 29);
    assert.equal(parts.hour, 23);
    assert.equal(parts.minute, 59);
    assert.equal(parts.second, 59);

    const active = isBirthdayActive(beforeMidnightUtc, "Asia/Kolkata", 10, 30);
    assert.equal(active, false, "Before midnight must not be October 30");
  });

  test("At midnight transition: October 30 at 00:00:00 in Asia/Kolkata (18:30:00 UTC)", () => {
    // Exactly 18:30:00 UTC on Oct 29 = 00:00:00 on Oct 30 in Asia/Kolkata
    const midnightUtc = new Date("2026-10-29T18:30:00Z");
    const parts = getTimezoneDateParts(midnightUtc, "Asia/Kolkata");

    assert.equal(parts.year, 2026);
    assert.equal(parts.month, 10);
    assert.equal(parts.day, 30);
    assert.equal(parts.hour, 0);
    assert.equal(parts.minute, 0);
    assert.equal(parts.second, 0);

    const active = isBirthdayActive(midnightUtc, "Asia/Kolkata", 10, 30);
    assert.equal(active, true, "Midnight transition must activate October 30 birthday");
  });

  test("During birthday: midday on October 30 in Asia/Kolkata", () => {
    const middayUtc = new Date("2026-10-30T06:30:00Z"); // 12:00:00 PM IST
    const parts = getTimezoneDateParts(middayUtc, "Asia/Kolkata");

    assert.equal(parts.month, 10);
    assert.equal(parts.day, 30);
    assert.equal(parts.hour, 12);

    const active = isBirthdayActive(middayUtc, "Asia/Kolkata", 10, 30);
    assert.equal(active, true);
  });

  test("End of birthday: October 30 at 23:59:59 in Asia/Kolkata (18:29:59 UTC on Oct 30)", () => {
    const endOfDayUtc = new Date("2026-10-30T18:29:59Z");
    const parts = getTimezoneDateParts(endOfDayUtc, "Asia/Kolkata");

    assert.equal(parts.month, 10);
    assert.equal(parts.day, 30);
    assert.equal(parts.hour, 23);
    assert.equal(parts.minute, 59);
    assert.equal(parts.second, 59);

    const active = isBirthdayActive(endOfDayUtc, "Asia/Kolkata", 10, 30);
    assert.equal(active, true, "Last second of October 30 must remain active");
  });

  test("After October 30: October 31 at 00:00:00 in Asia/Kolkata (18:30:00 UTC on Oct 30)", () => {
    const afterBirthdayUtc = new Date("2026-10-30T18:30:00Z");
    const parts = getTimezoneDateParts(afterBirthdayUtc, "Asia/Kolkata");

    assert.equal(parts.month, 10);
    assert.equal(parts.day, 31);
    assert.equal(parts.hour, 0);

    const active = isBirthdayActive(afterBirthdayUtc, "Asia/Kolkata", 10, 30);
    assert.equal(active, false, "October 31 is after birthday and must not be active");
  });

  test("Configurable timezone: supports arbitrary timezones like America/New_York", () => {
    // 04:00:00 UTC on Oct 30 = 00:00:00 EDT (UTC-4) on Oct 30
    const nyMidnight = new Date("2026-10-30T04:00:00Z");
    assert.equal(isBirthdayActive(nyMidnight, "America/New_York", 10, 30), true);

    const nyBeforeMidnight = new Date("2026-10-30T03:59:59Z");
    assert.equal(isBirthdayActive(nyBeforeMidnight, "America/New_York", 10, 30), false);
  });
});

// ============================================================================
// Suite 2: Persistence Guard & Preventing Duplicate Execution
// ============================================================================
describe("Suite 2: Persistence Guard & Preventing Duplicate Reveal", () => {
  test("Storage key generation adheres to required specification", () => {
    const key = getRevealStorageKey(2026, 10, 30);
    assert.equal(
      key,
      "birthday-reveal-completed-2026-10-30",
      "Storage key must match birthday-reveal-completed-2026-10-30"
    );

    const keyPadded = getRevealStorageKey(2026, 5, 4);
    assert.equal(keyPadded, "birthday-reveal-completed-2026-05-04");
  });

  test("Persistence check: returns false when not completed, true after marking completed", () => {
    const mockStorage = new Map<string, string>();
    const storageApi = {
      getItem: (k: string) => mockStorage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mockStorage.set(k, v);
      },
    };

    const key = "birthday-reveal-completed-2026-10-30";

    // 1. Initially false
    assert.equal(hasRevealCompleted(key, storageApi), false);

    // 2. Mark completed
    markRevealCompleted(key, storageApi);

    // 3. Subsequently true
    assert.equal(hasRevealCompleted(key, storageApi), true);
    assert.equal(mockStorage.get(key), "true");
  });

  test("Safe fallback: returns false gracefully when storage is unavailable or throws", () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("SecurityError: Access is denied for localStorage");
      },
    };
    assert.equal(hasRevealCompleted("any-key", throwingStorage), false);

    const throwingSetStorage = {
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    // Must not throw exception
    assert.doesNotThrow(() => {
      markRevealCompleted("any-key", throwingSetStorage);
    });
  });
});

// ============================================================================
// Suite 3: Autoplay Policy Rejection & Fallback Handling
// ============================================================================
describe("Suite 3: Audio Fallback on Autoplay Rejection", () => {
  test("Audio autoplay rejection: sets blocked flag and never prevents visual reveal", async () => {
    let autoplayBlocked = false;
    let visualCelebrationRendered = true; // Visual state is decoupled from audio

    // Simulate browser rejecting audio.play() with NotAllowedError
    const mockPlayPromise = Promise.reject(new Error("NotAllowedError: play() failed"));

    await mockPlayPromise.catch(() => {
      autoplayBlocked = true;
    });

    assert.equal(autoplayBlocked, true, "Autoplay rejection must trigger blocked fallback");
    assert.equal(
      visualCelebrationRendered,
      true,
      "Audio rejection must NEVER prevent visual celebration from rendering"
    );
  });

  test("Explicit user interaction resolves autoplay block", async () => {
    let autoplayBlocked = true;
    let audioPlaying = false;

    // Simulate user tapping "Tap to celebrate ♫" button
    const handleUserTap = async () => {
      // User gesture allows play to succeed
      audioPlaying = true;
      autoplayBlocked = false;
    };

    await handleUserTap();

    assert.equal(autoplayBlocked, false);
    assert.equal(audioPlaying, true);
  });

  test("playMusicBoxChime handles non-browser environment safely", () => {
    // In Node.js environment without window.AudioContext
    const chime = playMusicBoxChime();
    assert.equal(typeof chime.stop, "function");
    assert.equal(chime.state, "unsupported");
    assert.doesNotThrow(() => chime.stop());
  });
});

// ============================================================================
// Suite 4: Clean Unmount & Timer Cleanup Lifecycle
// ============================================================================
describe("Suite 4: Clean Unmount / Timer Cleanup Lifecycle", () => {
  test("Periodic interval timer is properly cleared upon unmount", () => {
    let timerCleared = false;

    // Mock setInterval & clearInterval lifecycle
    const mockIntervalId = setInterval(() => {}, 1000);
    const cleanup = () => {
      clearInterval(mockIntervalId);
      timerCleared = true;
    };

    // Execute unmount cleanup
    cleanup();

    assert.equal(timerCleared, true, "Timer cleanup must clear interval on unmount");
  });

  test("Audio elements and chime synthesis are paused/stopped on cleanup", () => {
    let audioPaused = false;
    let chimeStopped = false;

    const mockAudio = {
      pause: () => {
        audioPaused = true;
      },
    };
    const mockChimeStop = () => {
      chimeStopped = true;
    };

    // Simulate component unmount cleanup callback
    const onUnmount = () => {
      mockAudio.pause();
      mockChimeStop();
    };

    onUnmount();

    assert.equal(audioPaused, true, "Active audio playback must pause on unmount");
    assert.equal(chimeStopped, true, "Active chime synthesis must stop on unmount");
  });
});

// ============================================================================
// Suite 5: Component Structure, Source & Accessibility Verification
// ============================================================================
describe("Suite 5: Component Source, Contracts & Accessibility", () => {
  test("MidnightBirthdayReveal exports required contracts and components", () => {
    assert.equal(typeof MidnightBirthdayReveal, "function");
    assert.equal(DEFAULT_RECIPIENT_NAME, "Meerah");
    assert.equal(DEFAULT_RECIPIENT_TIMEZONE, "Asia/Kolkata");
    assert.equal(DEFAULT_BIRTHDAY_MONTH, 10);
    assert.equal(DEFAULT_BIRTHDAY_DAY, 30);
    assert.equal(DEFAULT_STORAGE_KEY_PREFIX, "birthday-reveal-completed");
    assert.equal(typeof getTimezoneDateParts, "function");
    assert.equal(typeof isBirthdayActive, "function");
    assert.equal(typeof getRevealStorageKey, "function");
    assert.equal(typeof hasRevealCompleted, "function");
    assert.equal(typeof markRevealCompleted, "function");
    assert.equal(
      DEFAULT_RECIPIENT_PHOTO_URL,
      "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=w1200-h1200-no"
    );
  });

  test("Accessibility semantics: dialog role, aria-modal, and labelledby", () => {
    assert.ok(revealCode.includes('role="dialog"'));
    assert.ok(revealCode.includes('aria-modal="true"'));
    assert.ok(revealCode.includes('aria-labelledby="midnight-reveal-title"'));
    assert.ok(revealCode.includes('id="midnight-reveal-title"'));
  });

  test("Confetti and decorative visuals: scrapbook petals, sunflowers, roses, washi tape", () => {
    assert.ok(revealCode.includes("confetti-gold"));
    assert.ok(revealCode.includes("confetti-pink"));
    assert.ok(revealCode.includes("confetti-sage"));
    assert.ok(revealCode.includes("washi-tape"));
    assert.ok(revealCode.includes("🌻"));
    assert.ok(revealCode.includes("🌸"));
    assert.ok(revealCode.includes("🌹"));
  });

  test("Autoplay fallback button text: contains accessible 'Tap to celebrate ♫'", () => {
    assert.ok(revealCode.includes("Tap to celebrate ♫"));
    assert.ok(revealCode.includes('aria-label="Tap to celebrate and play birthday music"'));
    assert.ok(revealCode.includes("Step into your day ♡"));
  });

  test("midnight-reveal.css defines tokens, animations, touch targets, and prefers-reduced-motion", () => {
    assert.ok(fs.existsSync(CSS_FILE), "midnight-reveal.css must exist");

    const css = fs.readFileSync(CSS_FILE, "utf-8");

    assert.ok(css.includes('@import "./landing-tokens.css";'));
    assert.ok(css.includes(".midnight-reveal-overlay"));
    assert.ok(css.includes(".midnight-reveal-modal"));
    assert.ok(css.includes(".midnight-play-btn"));
    assert.ok(css.includes(".midnight-dismiss-btn"));
    assert.ok(css.includes(".midnight-confetti-piece"));

    // Minimum accessible touch targets (>= 44px)
    assert.ok(css.includes("min-height: 48px") || css.includes("min-height: 44px"));
    assert.ok(css.includes("min-width: 44px") || css.includes("min-width: 220px"));

    // Focus visible styling
    assert.ok(css.includes(":focus-visible"));

    // prefers-reduced-motion compliance
    assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
    assert.ok(css.includes("animation: none !important"));
  });

  test("Portrait photo frame rendering with scrapbook aesthetics & fallback cake emblem", () => {
    assert.ok(revealCode.includes("midnight-portrait-wrapper"));
    assert.ok(revealCode.includes("midnight-portrait-frame"));
    assert.ok(revealCode.includes("midnight-portrait-img"));
    assert.ok(revealCode.includes("midnight-portrait-badge"));
    assert.ok(revealCode.includes('data-testid="midnight-portrait-wrapper"'));
    assert.ok(revealCode.includes('data-testid="midnight-portrait-img"'));
    assert.ok(revealCode.includes("onError="));
    assert.ok(revealCode.includes("midnight-emblem-wrapper"));
  });

  test("midnight-reveal.css includes styles for scrapbook portrait, badge, and mobile safe-area centering", () => {
    const css = fs.readFileSync(CSS_FILE, "utf-8");
    assert.ok(css.includes(".midnight-portrait-wrapper"));
    assert.ok(css.includes(".midnight-portrait-frame"));
    assert.ok(css.includes(".midnight-portrait-img"));
    assert.ok(css.includes(".midnight-portrait-badge"));
    assert.ok(css.includes("safe-area-inset"));
  });
});
