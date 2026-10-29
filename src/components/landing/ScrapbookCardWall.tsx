"use client";

import React, { useState, type JSX } from "react";
import "./scrapbook-card-wall.css";

export type ScrapbookDestination =
  | "birthday-book"
  | "letter"
  | "our-memories"
  | "camera"
  | "songs"
  | "study"
  | "games"
  | "video";

export interface ScrapbookCardWallProps {
  onSelectDestination: (dest: ScrapbookDestination) => void;
  unlockedSurprisesCount?: number;
  favoriteSongsCount?: number;
}

export interface ScrapbookCardConfig {
  id: ScrapbookDestination;
  title: string;
  kicker: string;
  caption: string;
  isPlanned: boolean;
  washiColor: "gold" | "pink" | "sage";
  washiPos: "washi-pos-left" | "washi-pos-center" | "washi-pos-right";
  chipColor: "chip-gold" | "chip-pink" | "chip-sage" | "chip-planned";
  defaultBadge: string;
  stampText: string;
  actionText: string;
  tiltAngle: string;
  plannedNotice?: string;
  svgIcon: React.ReactNode;
}

export const SCRAPBOOK_CARDS: readonly ScrapbookCardConfig[] = [
  {
    id: "birthday-book",
    title: "The Birthday Book",
    kicker: "Keepsake Volume",
    caption: "Turn each page to revisit cards, Urdu messages, and chapters crafted just for you.",
    isPlanned: false,
    washiColor: "sage",
    washiPos: "washi-pos-right",
    chipColor: "chip-sage",
    defaultBadge: "Keepsake Pages",
    stampText: "NO. 01 · VOLUME",
    actionText: "Open birthday book",
    tiltAngle: "-1.5deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <path d="M14 26C24 22 36 24 40 28C44 24 56 22 66 26V58C56 54 44 56 40 60C36 56 24 54 14 58V26Z" fill="#FFF9EF" stroke="#624752" strokeWidth="3" strokeLinejoin="round" />
        <line x1="40" y1="28" x2="40" y2="60" stroke="#624752" strokeWidth="2.5" />
        <path d="M22 36H32M22 44H30M48 36H58M48 44H56" stroke="#D4798D" strokeWidth="2" strokeLinecap="round" />
        <path d="M40 28V42L44 38L48 42V28" fill="#F1C75B" />
      </svg>
    ),
  },
  {
    id: "letter",
    title: "A Letter for You",
    kicker: "Heartfelt Words",
    caption: "Written with all my heart, sealed with love, and meant only for your eyes.",
    isPlanned: false,
    washiColor: "pink",
    washiPos: "washi-pos-center",
    chipColor: "chip-pink",
    defaultBadge: "Birthday Letter",
    stampText: "NO. 02 · KEEPSAKE",
    actionText: "Read heartfelt letter",
    tiltAngle: "1.8deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <rect x="12" y="24" width="56" height="38" rx="4" fill="#FFF9EF" stroke="#624752" strokeWidth="3" />
        <path d="M14 26L40 46L66 26" stroke="#624752" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="40" cy="46" r="8" fill="#D4798D" />
        <path d="M40 43C39 41.5 37 41.5 36 42.5C35 43.5 35 45.5 36 46.5L40 50L44 46.5C45 45.5 45 43.5 44 42.5C43 41.5 41 41.5 40 43Z" fill="#FFF9EF" />
        <path d="M60 16C58 20 62 24 62 24" stroke="#376E58" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "our-memories",
    title: "Our Memories",
    kicker: "Photo Stories",
    caption: "Sunlit afternoons, messy adventures, and snapshots we'll smile over forever.",
    isPlanned: false,
    washiColor: "gold",
    washiPos: "washi-pos-left",
    chipColor: "chip-gold",
    defaultBadge: "Photo Reel",
    stampText: "NO. 03 · STORIES",
    actionText: "Explore memory stories",
    tiltAngle: "-1.2deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <rect x="14" y="22" width="52" height="42" rx="8" fill="#FFF9EF" stroke="#624752" strokeWidth="3" />
        <circle cx="40" cy="43" r="14" fill="#EADBCE" stroke="#624752" strokeWidth="2.5" />
        <circle cx="40" cy="43" r="8" fill="#624752" />
        <circle cx="43" cy="40" r="2.5" fill="#FFF9EF" />
        <rect x="22" y="16" width="16" height="6" rx="2" fill="#D4798D" />
        <circle cx="57" cy="30" r="3" fill="#F1C75B" />
      </svg>
    ),
  },
  {
    id: "camera",
    title: "Make a Memory",
    kicker: "Snap Camera",
    caption: "Snap a birthday selfie or pick a cozy photo from today to save in your book.",
    isPlanned: false,
    washiColor: "pink",
    washiPos: "washi-pos-right",
    chipColor: "chip-pink",
    defaultBadge: "Instant Snap",
    stampText: "NO. 04 · CAMERA",
    actionText: "Open birthday camera",
    tiltAngle: "2.0deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <rect x="16" y="26" width="48" height="38" rx="7" fill="#FFF9EF" stroke="#624752" strokeWidth="3" />
        <path d="M28 26L32 18H48L52 26" stroke="#624752" strokeWidth="2.5" fill="#EADBCE" />
        <circle cx="40" cy="45" r="12" fill="#FFF9EF" stroke="#624752" strokeWidth="2.5" />
        <circle cx="40" cy="45" r="6" fill="#D4798D" />
        <circle cx="54" cy="34" r="3" fill="#F1C75B" />
      </svg>
    ),
  },
  {
    id: "songs",
    title: "Songs That Remind Me of You",
    kicker: "Shared Soundscape",
    caption: "The melodies that hold our laughter, road trips, and midnight conversations.",
    isPlanned: false,
    washiColor: "sage",
    washiPos: "washi-pos-left",
    chipColor: "chip-sage",
    defaultBadge: "Curated Playlist",
    stampText: "NO. 05 · VINYL",
    actionText: "Listen to music",
    tiltAngle: "-1.8deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <circle cx="40" cy="40" r="26" fill="#3D2B33" stroke="#624752" strokeWidth="2.5" />
        <circle cx="40" cy="40" r="20" stroke="#846F77" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="40" cy="40" r="14" stroke="#846F77" strokeWidth="1" />
        <circle cx="40" cy="40" r="9" fill="#F1C75B" stroke="#624752" strokeWidth="1.5" />
        <circle cx="40" cy="40" r="3" fill="#3D2B33" />
        <path d="M56 16V28M56 20L65 17V25" stroke="#D4798D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "study",
    title: "Read & Study",
    kicker: "Curated Bookshelf",
    caption: "Browse thoughtfully selected books, literature, poetry, and quiet reading recommendations.",
    isPlanned: false,
    washiColor: "gold",
    washiPos: "washi-pos-center",
    chipColor: "chip-gold",
    defaultBadge: "Books & Study",
    stampText: "NO. 06 · STUDY",
    actionText: "Explore bookshelf",
    tiltAngle: "1.4deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <path d="M18 56L38 60L58 56V26L38 30L18 26V56Z" fill="#FFF9EF" stroke="#624752" strokeWidth="3" />
        <line x1="38" y1="30" x2="38" y2="60" stroke="#624752" strokeWidth="2.5" />
        <path d="M26 36L34 38M26 44L34 46M42 38L50 36M42 46L50 44" stroke="#376E58" strokeWidth="2" strokeLinecap="round" />
        <path d="M38 18V28" stroke="#D4798D" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "games",
    title: "Birthday Games",
    kicker: "Playful Moments",
    caption: "Memory card matching, sweet word puzzles, and birthday trivia made just for you.",
    isPlanned: false,
    washiColor: "pink",
    washiPos: "washi-pos-left",
    chipColor: "chip-pink",
    defaultBadge: "Playable Games",
    stampText: "NO. 07 · GAMES",
    actionText: "Play birthday games",
    tiltAngle: "-1.0deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <rect x="16" y="28" width="48" height="30" rx="10" fill="#FFF9EF" stroke="#624752" strokeWidth="3" />
        <circle cx="28" cy="43" r="5" fill="#D4798D" />
        <path d="M48 39H54M51 36V42" stroke="#624752" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="51" cy="48" r="2.5" fill="#F1C75B" />
        <path d="M32 28V20M48 28V20" stroke="#376E58" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "video",
    title: "Birthday Video Reel",
    kicker: "Moments in Motion",
    caption: "A cinematic look back at the moments that made this year so wonderfully special.",
    isPlanned: false,
    washiColor: "gold",
    washiPos: "washi-pos-right",
    chipColor: "chip-gold",
    defaultBadge: "Video Reel",
    stampText: "NO. 08 · CINEMA",
    actionText: "Watch birthday video",
    tiltAngle: "1.6deg",
    svgIcon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="scrapbook-card-svg" aria-hidden="true">
        <rect x="14" y="24" width="52" height="38" rx="6" fill="#3D2B33" stroke="#624752" strokeWidth="3" />
        <polygon points="34,35 34,51 48,43" fill="#F1C75B" />
        <rect x="14" y="20" width="52" height="5" fill="#D4798D" />
        <circle cx="20" cy="22.5" r="1.5" fill="#FFF9EF" />
        <circle cx="28" cy="22.5" r="1.5" fill="#FFF9EF" />
        <circle cx="36" cy="22.5" r="1.5" fill="#FFF9EF" />
        <circle cx="44" cy="22.5" r="1.5" fill="#FFF9EF" />
        <circle cx="52" cy="22.5" r="1.5" fill="#FFF9EF" />
        <circle cx="60" cy="22.5" r="1.5" fill="#FFF9EF" />
      </svg>
    ),
  },
];

export function isPlannedDestination(dest?: ScrapbookDestination): boolean {
  void dest;
  return false;
}

export function getCardBadgeText(
  dest: ScrapbookDestination,
  props: { unlockedSurprisesCount?: number; favoriteSongsCount?: number }
): string {
  if (dest === "songs" && typeof props.favoriteSongsCount === "number" && props.favoriteSongsCount > 0) {
    return `${props.favoriteSongsCount} Tracks Favorited`;
  }
  const card = SCRAPBOOK_CARDS.find((c) => c.id === dest);
  return card?.defaultBadge ?? "";
}

export function getCardAriaLabel(
  card: ScrapbookCardConfig,
  props: { unlockedSurprisesCount?: number; favoriteSongsCount?: number }
): string {
  const badgeText = getCardBadgeText(card.id, props);
  if (card.isPlanned) {
    return `${card.title} (${badgeText}): ${card.caption}`;
  }
  return `Open ${card.title} (${badgeText}): ${card.caption}`;
}

export function ScrapbookCardWall(props: ScrapbookCardWallProps): JSX.Element {
  const [activeNotice, setActiveNotice] = useState<string | null>(null);

  const handleCardClick = (card: ScrapbookCardConfig) => {
    if (card.isPlanned) {
      setActiveNotice(
        card.plannedNotice ??
          `✨ ${card.title} is a planned Wave 2 surprise! Coming soon.`
      );
    } else {
      setActiveNotice(null);
    }
    props.onSelectDestination(card.id);
  };

  return (
    <section
      className="scrapbook-wall-section"
      aria-label="Scrapbook Memory Wall"
      id="scrapbook-card-wall"
    >
      {/* Wall Header */}
      <div className="scrapbook-wall-header">
        <span className="scrapbook-wall-kicker">
          <span aria-hidden="true">✿</span> Interactive Memory Wall
        </span>
        <h2 className="scrapbook-wall-title">
          Turn the pages of <em>our story</em>
        </h2>
        <p className="scrapbook-wall-subtitle">
          Polaroids, letters, tunes, and treasures curated with warmth. Tap any
          memory to explore its keepsake.
        </p>
      </div>

      {/* Gentle Wave 2 / Inline Notice Banner */}
      {activeNotice && (
        <div
          className="scrapbook-notification"
          role="status"
          aria-live="polite"
        >
          <div className="scrapbook-notification-content">
            <span className="scrapbook-notification-icon" aria-hidden="true">
              🌸
            </span>
            <span>{activeNotice}</span>
          </div>
          <button
            type="button"
            className="scrapbook-notification-close"
            onClick={() => setActiveNotice(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Responsive Scrapbook Card Grid */}
      <div className="scrapbook-grid" role="list">
        {SCRAPBOOK_CARDS.map((card) => {
          const badgeText = getCardBadgeText(card.id, props);
          const ariaLabel = getCardAriaLabel(card, props);

          return (
            <div key={card.id} role="listitem">
              <button
                type="button"
                className={`scrapbook-card-button ${card.isPlanned ? "scrapbook-card-planned" : ""}`}
                style={{ "--card-tilt": card.tiltAngle } as React.CSSProperties}
                onClick={() => handleCardClick(card)}
                aria-label={ariaLabel}
                data-destination={card.id}
                data-planned={card.isPlanned ? "true" : "false"}
              >
                {/* Washi Tape Accent */}
                <div
                  className={`scrapbook-washi washi-${card.washiColor} ${card.washiPos}`}
                  aria-hidden="true"
                />

                {/* Polaroid Artwork / Media */}
                <div className="scrapbook-card-media">
                  <div className="scrapbook-card-media-inner">
                    {card.svgIcon}
                  </div>
                  <span className="scrapbook-stamp" aria-hidden="true">
                    {card.stampText}
                  </span>
                </div>

                {/* Polaroid Caption & Metadata */}
                <div className="scrapbook-card-body">
                  <div className="scrapbook-card-meta">
                    <span className="scrapbook-card-kicker">
                      {card.kicker}
                    </span>
                    <span
                      className={`scrapbook-badge-chip ${card.chipColor}`}
                    >
                      {badgeText}
                    </span>
                  </div>

                  <h3 className="scrapbook-card-title">{card.title}</h3>
                  <p className="scrapbook-card-caption">{card.caption}</p>

                  <div className="scrapbook-card-action">
                    <span>
                      {card.isPlanned ? "Planned Feature" : card.actionText}
                    </span>
                    <span className="scrapbook-action-arrow" aria-hidden="true">
                      {card.isPlanned ? "✦" : "→"}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
