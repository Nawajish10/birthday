"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { JSX } from "react";
import "./midnight-reveal.css";

export const DEFAULT_RECIPIENT_NAME = "Meerah";
export const DEFAULT_RECIPIENT_PHOTO_URL =
  "https://lh3.googleusercontent.com/pw/AP1GczMLasTHYPPFuDPfLPRSnH5tQ6mhgV3XNu-V5SBjy_maHYwLX5_Ej716nIoS7pipr9aPZrJObZTzo-QGHxKckSqpY6EtdiRb_qnVCyjw_1dU1tYIk3iF=w1200-h1200-no";
export const SPECIAL_POPUP_PHOTO = DEFAULT_RECIPIENT_PHOTO_URL;
export const DEFAULT_RECIPIENT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_BIRTHDAY_MONTH = 10; // October
export const DEFAULT_BIRTHDAY_DAY = 30; // 30th
export const DEFAULT_STORAGE_KEY_PREFIX = "birthday-reveal-completed";
export const DEFAULT_URDU_BLESSING = "تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے";

// In-memory fallback for private browsing or environments where localStorage throws/is disabled
const inMemoryDismissedKeys = new Set<string>();

/**
 * Resets the in-memory dismissed keys set (used for testing and test isolation).
 */
export function resetInMemoryDismissedKeys(): void {
  inMemoryDismissedKeys.clear();
}

export interface TimezoneDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts date components for a given timezone using standard Intl.DateTimeFormat.
 */
export function getTimezoneDateParts(
  date: Date = new Date(),
  timeZone: string = DEFAULT_RECIPIENT_TIMEZONE
): TimezoneDateParts {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    let year = date.getUTCFullYear();
    let month = date.getUTCMonth() + 1;
    let day = date.getUTCDate();
    let hour = date.getUTCHours();
    let minute = date.getUTCMinutes();
    let second = date.getUTCSeconds();

    for (const p of parts) {
      if (p.type === "year") year = parseInt(p.value, 10);
      else if (p.type === "month") month = parseInt(p.value, 10);
      else if (p.type === "day") day = parseInt(p.value, 10);
      else if (p.type === "hour") {
        const h = parseInt(p.value, 10);
        hour = h === 24 ? 0 : h;
      } else if (p.type === "minute") minute = parseInt(p.value, 10);
      else if (p.type === "second") second = parseInt(p.value, 10);
    }

    return { year, month, day, hour, minute, second };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
}

/**
 * Timezone-aware date checker.
 * Returns true if the given date represents the birthday in the target timezone.
 */
export function isBirthdayActive(
  date: Date = new Date(),
  timeZone: string = DEFAULT_RECIPIENT_TIMEZONE,
  targetMonth: number = DEFAULT_BIRTHDAY_MONTH,
  targetDay: number = DEFAULT_BIRTHDAY_DAY
): boolean {
  const parts = getTimezoneDateParts(date, timeZone);
  return parts.month === targetMonth && parts.day === targetDay;
}

/**
 * Constructs the deterministic localStorage key for a birthday reveal.
 * Default for 2026-10-30: "birthday-reveal-completed-2026-10-30"
 */
export function getRevealStorageKey(
  year: number,
  month: number = DEFAULT_BIRTHDAY_MONTH,
  day: number = DEFAULT_BIRTHDAY_DAY
): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${DEFAULT_STORAGE_KEY_PREFIX}-${year}-${mm}-${dd}`;
}

/**
 * Checks whether the reveal has already been completed in storage.
 */
export function hasRevealCompleted(
  storageKey: string,
  storage?: { getItem: (key: string) => string | null }
): boolean {
  if (inMemoryDismissedKeys.has(storageKey)) {
    return true;
  }
  try {
    const s =
      storage ||
      (typeof window !== "undefined" && typeof window.localStorage !== "undefined"
        ? window.localStorage
        : null);
    if (!s) return false;
    return s.getItem(storageKey) === "true";
  } catch {
    return false;
  }
}

/**
 * Marks the reveal as completed in storage.
 */
export function markRevealCompleted(
  storageKey: string,
  storage?: { setItem: (key: string, value: string) => void }
): void {
  inMemoryDismissedKeys.add(storageKey);
  try {
    const s =
      storage ||
      (typeof window !== "undefined" && typeof window.localStorage !== "undefined"
        ? window.localStorage
        : null);
    if (s) {
      s.setItem(storageKey, "true");
    }
  } catch {
    // Graceful fallback for private browsing or quota limits
  }
}

/**
 * Plays a soft music-box acoustic Happy Birthday melody using the Web Audio API.
 * Returns a function to stop the melody.
 */
export function playMusicBoxChime(): { stop: () => void; state: string } {
  if (typeof window === "undefined") {
    return { stop: () => {}, state: "unsupported" };
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    return { stop: () => {}, state: "unsupported" };
  }

  try {
    const ctx = new AudioCtx();
    let isStopped = false;

    // Melody: Happy Birthday (notes in Hz: G4, G4, A4, G4, C5, B4)
    const notes = [
      { freq: 392.0, dur: 0.35, pause: 0.1 },
      { freq: 392.0, dur: 0.35, pause: 0.1 },
      { freq: 440.0, dur: 0.6, pause: 0.1 },
      { freq: 392.0, dur: 0.6, pause: 0.1 },
      { freq: 523.25, dur: 0.6, pause: 0.1 },
      { freq: 493.88, dur: 1.0, pause: 0.2 },
    ];

    let start = ctx.currentTime + 0.05;

    notes.forEach((n) => {
      if (isStopped) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(n.freq, start);

      // Bell / music-box envelope: quick attack, natural exponential decay
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + n.dur);

      start += n.dur + n.pause;
    });

    return {
      stop: () => {
        isStopped = true;
        try {
          ctx.close();
        } catch {
          // Ignore close errors
        }
      },
      state: ctx.state,
    };
  } catch {
    return { stop: () => {}, state: "error" };
  }
}

export interface MidnightBirthdayRevealProps {
  recipientName?: string;
  recipientPhotoUrl?: string;
  recipientTimezone?: string;
  birthdayMonth?: number;
  birthdayDay?: number;
  forcePreview?: boolean;
  onRevealComplete?: () => void;
  onPlayAudio?: () => void;
  audioSrc?: string;
  checkIntervalMs?: number;
}

export function MidnightBirthdayReveal({
  recipientName = DEFAULT_RECIPIENT_NAME,
  recipientPhotoUrl = DEFAULT_RECIPIENT_PHOTO_URL,
  recipientTimezone = DEFAULT_RECIPIENT_TIMEZONE,
  birthdayMonth = DEFAULT_BIRTHDAY_MONTH,
  birthdayDay = DEFAULT_BIRTHDAY_DAY,
  forcePreview = false,
  onRevealComplete,
  onPlayAudio,
  audioSrc,
  checkIntervalMs = 1000,
}: MidnightBirthdayRevealProps): JSX.Element | null {
  const [isVisible, setIsVisible] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [recipientPhotoUrl]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chimeStopRef = useRef<(() => void) | null>(null);
  const storageKeyRef = useRef<string>("");

  // Determine active date parts and storage key
  const activeName = recipientName?.trim() || DEFAULT_RECIPIENT_NAME;

  // Primary playback handler
  const playBirthdayAudio = useCallback(() => {
    onPlayAudio?.();
    // 1. If explicit audioSrc provided, use HTMLAudioElement
    if (audioSrc) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(audioSrc);
        }
        const promise = audioRef.current.play();
        if (promise !== undefined) {
          promise
            .then(() => {
              setAutoplayBlocked(false);
              setAudioPlaying(true);
            })
            .catch(() => {
              // Browser autoplay policy rejected playback
              setAutoplayBlocked(true);
              setAudioPlaying(false);
            });
        }
      } catch {
        setAutoplayBlocked(true);
        setAudioPlaying(false);
      }
      return;
    }

    // 2. Otherwise trigger gentle music-box acoustic chime
    try {
      if (chimeStopRef.current) {
        chimeStopRef.current();
        chimeStopRef.current = null;
      }
      const chime = playMusicBoxChime();
      chimeStopRef.current = chime.stop;
      if (chime.state === "suspended") {
        chime.stop();
        chimeStopRef.current = null;
        setAutoplayBlocked(true);
        setAudioPlaying(false);
      } else if (chime.state === "running") {
        setAutoplayBlocked(false);
        setAudioPlaying(true);
      }
    } catch {
      setAutoplayBlocked(true);
      setAudioPlaying(false);
    }
  }, [audioSrc, onPlayAudio]);

  // Periodic real-time transition checker
  useEffect(() => {
    const evaluate = () => {
      const now = new Date();
      const parts = getTimezoneDateParts(now, recipientTimezone);
      const key = getRevealStorageKey(parts.year, birthdayMonth, birthdayDay);
      storageKeyRef.current = key;

      if (forcePreview) {
        setIsVisible(true);
        return;
      }

      const isToday = isBirthdayActive(now, recipientTimezone, birthdayMonth, birthdayDay);
      const alreadyDone = hasRevealCompleted(key);

      if (isToday && !alreadyDone) {
        setIsVisible(true);
      } else if (!isToday && !forcePreview) {
        setIsVisible(false);
      }
    };

    evaluate();

    // Check periodically without requiring a page refresh
    const timerId = setInterval(evaluate, checkIntervalMs);

    return () => {
      clearInterval(timerId);
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {
          // Ignore
        }
      }
      if (chimeStopRef.current) {
        chimeStopRef.current();
        chimeStopRef.current = null;
      }
    };
  }, [recipientTimezone, birthdayMonth, birthdayDay, forcePreview, checkIntervalMs]);

  // Attempt audio playback when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        playBirthdayAudio();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isVisible, playBirthdayAudio]);

  // Manual button click when autoplay is rejected
  const handleTapToCelebrate = () => {
    if (chimeStopRef.current) {
      chimeStopRef.current();
      chimeStopRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current
        .play()
        .then(() => {
          setAutoplayBlocked(false);
          setAudioPlaying(true);
        })
        .catch(() => {
          // If still blocked or errored, try chime fallback
          const chime = playMusicBoxChime();
          chimeStopRef.current = chime.stop;
          setAutoplayBlocked(false);
          setAudioPlaying(true);
        });
    } else {
      const chime = playMusicBoxChime();
      chimeStopRef.current = chime.stop;
      setAutoplayBlocked(false);
      setAudioPlaying(true);
    }
  };

  // Dismiss modal and persist completed state
  const handleDismiss = useCallback(() => {
    const key =
      storageKeyRef.current ||
      getRevealStorageKey(new Date().getFullYear(), birthdayMonth, birthdayDay);
    markRevealCompleted(key);
    setIsVisible(false);
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch {
        // Ignore
      }
    }
    if (chimeStopRef.current) {
      chimeStopRef.current();
      chimeStopRef.current = null;
    }
    onRevealComplete?.();
  }, [birthdayMonth, birthdayDay, onRevealComplete]);

  // Escape key accessibility handler
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, handleDismiss]);

  // If outside birthday and not forcePreview, render nothing
  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className="midnight-reveal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="midnight-reveal-title"
      data-testid="midnight-reveal-dialog"
    >
      {/* Falling celebratory confetti & petals */}
      <div className="midnight-confetti-container" aria-hidden="true">
        <div className="midnight-confetti-piece confetti-strip confetti-gold confetti-p1" />
        <div className="midnight-confetti-piece confetti-glyph confetti-p2">🌻</div>
        <div className="midnight-confetti-piece confetti-strip confetti-pink confetti-p3" />
        <div className="midnight-confetti-piece confetti-glyph confetti-p4">🌸</div>
        <div className="midnight-confetti-piece confetti-strip confetti-sage confetti-p5" />
        <div className="midnight-confetti-piece confetti-glyph confetti-p6">❀</div>
        <div className="midnight-confetti-piece confetti-strip confetti-ivory confetti-p7" />
        <div className="midnight-confetti-piece confetti-glyph confetti-p8">✦</div>
        <div className="midnight-confetti-piece confetti-strip confetti-gold confetti-p9" />
        <div className="midnight-confetti-piece confetti-glyph confetti-p10">🌹</div>
      </div>

      {/* Main Handcrafted Scrapbook Celebratory Modal Banner */}
      <div className="midnight-reveal-modal" data-testid="midnight-reveal-modal">
        {/* Washi tape styling accents */}
        <div className="washi-tape washi-tape-pink midnight-washi-top-left" aria-hidden="true" />
        <div className="washi-tape washi-tape-sage midnight-washi-top-right" aria-hidden="true" />
        <div className="washi-tape midnight-washi-bottom-center" aria-hidden="true" />

        {/* Close icon button */}
        <button
          type="button"
          className="midnight-close-icon-btn"
          onClick={handleDismiss}
          aria-label="Close celebration banner"
          data-testid="midnight-close-icon"
        >
          ×
        </button>

        {/* Midnight Kicker */}
        <div className="midnight-kicker-wrapper">
          <p className="midnight-kicker" data-testid="midnight-kicker">
            <span className="midnight-kicker-mark" aria-hidden="true">
              ✿
            </span>
            <span>MIDNIGHT REVEAL · OCTOBER 30 · </span>
            <span lang="ur" dir="rtl" className="midnight-kicker-urdu">
              سالگرہ مبارک
            </span>
          </p>
        </div>

        {/* Celebratory Portrait with Scrapbook Frame or Cake Emblem Fallback */}
        {!imageError && recipientPhotoUrl ? (
          <div className="midnight-portrait-wrapper" data-testid="midnight-portrait-wrapper">
            <div className="midnight-portrait-frame">
              <div className="washi-tape washi-tape-sage midnight-portrait-tape" aria-hidden="true" />
              <img
                src={recipientPhotoUrl}
                alt={`${activeName}'s birthday portrait`}
                className="midnight-portrait-img"
                data-testid="midnight-portrait-img"
                onError={() => setImageError(true)}
                loading="eager"
              />
              <div className="midnight-portrait-badge" aria-hidden="true">
                <span>✿</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="midnight-emblem-wrapper" aria-hidden="true">
            <svg className="midnight-emblem-svg" viewBox="0 0 48 48">
              {/* Candle & Flame */}
              <path d="M 24 6 C 24 6, 21 11, 21 14 C 21 16, 22.3 17, 24 17 C 25.7 17, 27 16, 27 14 C 27 11, 24 6, 24 6 Z" fill="#F1C75B" />
              <path d="M 23 17 L 25 17 L 25 24 L 23 24 Z" fill="#624752" />
              {/* Cake Tiers */}
              <rect x="15" y="24" width="18" height="9" rx="2" fill="#F8E8EC" stroke="#D4798D" strokeWidth="1.2" />
              <rect x="11" y="33" width="26" height="10" rx="3" fill="#FFF9EF" stroke="#EADBCE" strokeWidth="1.2" />
              {/* Cake Garland Dots */}
              <circle cx="18" cy="28" r="1.5" fill="#F1C75B" />
              <circle cx="24" cy="28" r="1.5" fill="#D4798D" />
              <circle cx="30" cy="28" r="1.5" fill="#F1C75B" />
            </svg>
          </div>
        )}

        {/* Personalized Headline */}
        <h2 id="midnight-reveal-title" className="midnight-title" data-testid="midnight-title">
          Happy Birthday, <em>{activeName}</em>!
        </h2>

        {/* Warm supporting message */}
        <p className="midnight-supporting-copy" data-testid="midnight-message">
          The clock has just struck midnight. The world is quiet, but right here, a whole celebration
          made of memories, petals, and endless love is waiting just for you.
        </p>

        {/* Urdu blessing banner with proper RTL */}
        <div className="midnight-urdu-box" lang="ur" dir="rtl" data-testid="midnight-urdu">
          <p className="midnight-urdu-text">{DEFAULT_URDU_BLESSING}</p>
        </div>

        {/* Action Controls */}
        <div className="midnight-actions-wrapper">
          {autoplayBlocked && (
            <button
              type="button"
              className="midnight-play-btn"
              onClick={handleTapToCelebrate}
              data-testid="midnight-tap-to-celebrate"
              aria-label="Tap to celebrate and play birthday music"
            >
              <span>Tap to celebrate ♫</span>
            </button>
          )}

          {audioPlaying && (
            <span className="midnight-audio-status" aria-live="polite" data-testid="midnight-audio-playing">
              <span>♫</span> Celebrating with music
            </span>
          )}

          <button
            type="button"
            className="midnight-dismiss-btn"
            onClick={handleDismiss}
            data-testid="midnight-dismiss-btn"
            aria-label="Step into your day"
          >
            <span>Step into your day ♡</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default MidnightBirthdayReveal;
