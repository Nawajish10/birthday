"use client";

import React, { type JSX, type KeyboardEvent } from "react";
import "./book-invitation.css";

export const DEFAULT_BOOK_INVITATION_HEADING = "There's a little more to this story.";
export const DEFAULT_BOOK_INVITATION_SUPPORTING =
  "Every page holds something I wanted you to see, remember or feel.";
export const DEFAULT_BOOK_INVITATION_KICKER = "Keepsake volume · تمہاری سالگرہ";
export const DEFAULT_BOOK_COVER_TITLE = "For my baba";
export const DEFAULT_BOOK_COVER_URDU = "تمہاری سالگرہ";
export const DEFAULT_BOOK_ACTION_LABEL = "Open your birthday book";
export const DEFAULT_BOOK_TOTAL_PAGES = 7;

export interface BirthdayBookInvitationProps {
  heading?: string;
  supportingText?: string;
  onOpenBook: () => void;
  totalPagesCount?: number;
  coverTitle?: string;
  coverUrdu?: string;
  kicker?: string;
  actionLabel?: string;
  className?: string;
}

export function BirthdayBookInvitation({
  heading = DEFAULT_BOOK_INVITATION_HEADING,
  supportingText = DEFAULT_BOOK_INVITATION_SUPPORTING,
  onOpenBook,
  totalPagesCount = DEFAULT_BOOK_TOTAL_PAGES,
  coverTitle = DEFAULT_BOOK_COVER_TITLE,
  coverUrdu = DEFAULT_BOOK_COVER_URDU,
  kicker = DEFAULT_BOOK_INVITATION_KICKER,
  actionLabel = DEFAULT_BOOK_ACTION_LABEL,
  className = "",
}: BirthdayBookInvitationProps): JSX.Element {
  const pagesCount =
    typeof totalPagesCount === "number" && totalPagesCount > 0
      ? totalPagesCount
      : DEFAULT_BOOK_TOTAL_PAGES;

  const handleBookKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpenBook?.();
    }
  };

  return (
    <section
      className={`book-invitation-section ${className}`.trim()}
      aria-labelledby="book-invitation-heading"
    >
      {/* Header Area */}
      <div className="book-invitation-header">
        <span className="book-invitation-kicker">{kicker}</span>
        <h2 id="book-invitation-heading" className="book-invitation-heading">
          {heading}
        </h2>
        <p className="book-invitation-supporting">{supportingText}</p>
      </div>

      {/* 3D Physical Book Showcase */}
      <div className="book-invitation-stage">
        <div
          className="book-invitation-3d-wrapper"
          role="button"
          tabIndex={0}
          onClick={onOpenBook}
          onKeyDown={handleBookKeyDown}
          aria-label={`${actionLabel} - ${coverTitle} (${pagesCount} Keepsake Pages)`}
        >
          {/* Floor contact shadow */}
          <div className="book-invitation-shadow" aria-hidden="true" />

          {/* Book physical presentation */}
          <div className="book-invitation-cover">
            {/* Book Spine */}
            <div className="book-invitation-spine" aria-hidden="true">
              <div className="book-invitation-spine-crease" />
              <span className="book-invitation-spine-text">2026 · KEEPSAKE</span>
            </div>

            {/* Book Face & Antique Gold Foil Stamp */}
            <div className="book-invitation-face">
              <div className="book-invitation-border-frame" aria-hidden="true" />
              <div className="book-invitation-foil-stamp">
                <span className="book-invitation-foil-icon" aria-hidden="true">
                  ✿
                </span>
                <h3 className="book-invitation-foil-title">{coverTitle}</h3>
                <p className="book-invitation-foil-urdu" lang="ur" dir="rtl">
                  {coverUrdu}
                </p>
                <span className="book-invitation-foil-subtitle">
                  MEMORIES · WORDS · MUSIC
                </span>
              </div>

              {/* Decorative Corner Filigrees */}
              <div className="book-invitation-corner top-left" aria-hidden="true">
                ⌜
              </div>
              <div className="book-invitation-corner top-right" aria-hidden="true">
                ⌝
              </div>
              <div className="book-invitation-corner bottom-left" aria-hidden="true">
                ⌞
              </div>
              <div className="book-invitation-corner bottom-right" aria-hidden="true">
                ⌟
              </div>
            </div>

            {/* Deckled Edge Layers & Ribbon */}
            <div className="book-invitation-page-edges" aria-hidden="true">
              <div className="book-invitation-edge-layer edge-layer-1" />
              <div className="book-invitation-edge-layer edge-layer-2" />
              <div className="book-invitation-ribbon" />
            </div>
          </div>

          {/* Total Pages Badge */}
          <div className="book-invitation-pages-badge" aria-hidden="true">
            <span>{pagesCount} Pages</span>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="book-invitation-actions">
        <button
          type="button"
          className="book-invitation-cta-btn"
          onClick={onOpenBook}
          aria-label={actionLabel}
        >
          <span className="book-invitation-btn-icon" aria-hidden="true">
            📖
          </span>
          <span>{actionLabel}</span>
          <span className="book-invitation-btn-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </section>
  );
}
