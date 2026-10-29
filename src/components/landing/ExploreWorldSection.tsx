"use client";

import React, { type JSX } from "react";
import "./explore-world.css";

export const DEFAULT_EXPLORE_HEADING = "Explore your world.";
export const DEFAULT_EXPLORE_SUPPORTING =
  "Every corner was designed to make you smile — choose where to wander next.";
export const DEFAULT_EXPLORE_KICKER = "Destinations · تمہاری دنیا";

export interface WorldDestinationCard {
  id: string;
  title: string;
  icon: string;
  badge: string;
  description: string;
  washiColor: "gold" | "pink" | "sage";
  chipColor: "chip-gold" | "chip-pink" | "chip-sage";
}

export const DEFAULT_WORLD_DESTINATIONS: readonly WorldDestinationCard[] = [
  {
    id: "profile",
    title: "Profile",
    icon: "▦",
    badge: "▦ Profile",
    description: "Her story, favorites & gallery",
    washiColor: "gold",
    chipColor: "chip-gold",
  },
  {
    id: "games",
    title: "Games",
    icon: "🎮",
    badge: "🎮 Games",
    description: "Solo & multiplayer birthday games",
    washiColor: "pink",
    chipColor: "chip-pink",
  },
  {
    id: "study",
    title: "Study",
    icon: "📖",
    badge: "📖 Study",
    description: "12 genres, reading templates & cards",
    washiColor: "sage",
    chipColor: "chip-sage",
  },
  {
    id: "songs",
    title: "Music Room",
    icon: "♫",
    badge: "♫ Music Room",
    description: "Private songbook & playlists",
    washiColor: "pink",
    chipColor: "chip-pink",
  },
  {
    id: "stories",
    title: "Memories",
    icon: "◎",
    badge: "◎ Memories",
    description: "Snapchat camera & photo stories",
    washiColor: "gold",
    chipColor: "chip-gold",
  },
  {
    id: "birthday-book",
    title: "Birthday Book",
    icon: "✿",
    badge: "✿ Birthday Book",
    description: "Keepsake flipbook",
    washiColor: "sage",
    chipColor: "chip-sage",
  },
];

export interface ExploreWorldSectionProps {
  heading?: string;
  supportingText?: string;
  onNavigate: (destination: string) => void;
  destinations?: readonly WorldDestinationCard[];
  unlockedSurprisesCount?: number;
  favoriteSongsCount?: number;
  className?: string;
}

export function ExploreWorldSection({
  heading = DEFAULT_EXPLORE_HEADING,
  supportingText = DEFAULT_EXPLORE_SUPPORTING,
  onNavigate,
  destinations = DEFAULT_WORLD_DESTINATIONS,
  className = "",
}: ExploreWorldSectionProps): JSX.Element {
  const cards = destinations && destinations.length > 0 ? destinations : DEFAULT_WORLD_DESTINATIONS;

  const washiClassMap = {
    gold: "",
    pink: "washi-tape-pink",
    sage: "washi-tape-sage",
  };

  return (
    <section
      className={`explore-world-section ${className}`.trim()}
      aria-labelledby="explore-world-heading"
    >
      {/* Header */}
      <div className="explore-world-header">
        <span className="explore-world-kicker">{DEFAULT_EXPLORE_KICKER}</span>
        <h2 id="explore-world-heading" className="explore-world-heading">
          {heading}
        </h2>
        <p className="explore-world-supporting">{supportingText}</p>
      </div>

      {/* Destinations Grid */}
      <div
        className="explore-world-grid"
        role="navigation"
        aria-label="Birthday experience destinations"
      >
        {cards.map((dest, idx) => {
          const tapeClass = washiClassMap[dest.washiColor] || "";

          return (
            <button
              type="button"
              key={dest.id || idx}
              className="explore-world-card"
              onClick={() => onNavigate(dest.id)}
              aria-label={`Go to ${dest.title} - ${dest.description}`}
            >
              {/* Decorative Washi Tape */}
              <div
                className={`washi-tape ${tapeClass}`.trim()}
                aria-hidden="true"
              />

              {/* Card Top Row: Badge & Number */}
              <div className="explore-card-top">
                <span className={`explore-card-badge ${dest.chipColor}`}>
                  <span className="explore-card-icon-glyph" aria-hidden="true">
                    {dest.icon}
                  </span>
                  <span>{dest.badge}</span>
                </span>
                <span className="explore-card-stamp" aria-hidden="true">
                  NO. 0{idx + 1}
                </span>
              </div>

              {/* Card Title & Description */}
              <div className="explore-card-content">
                <h3 className="explore-card-title">{dest.title}</h3>
                <p className="explore-card-desc">{dest.description}</p>
              </div>

              {/* Action row */}
              <div className="explore-card-arrow-row" aria-hidden="true">
                <span>Enter {dest.title}</span>
                <span className="explore-card-arrow">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
