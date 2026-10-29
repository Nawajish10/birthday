"use client";

import React, { type JSX } from "react";
import "./closing-message.css";

export const DEFAULT_CLOSING_HEADING = "And one last thing…";
export const DEFAULT_CLOSING_MESSAGE =
  "I hope this little world reminds you how special you are. May this new year of your life bring you happiness, beautiful surprises and countless reasons to smile.";
export const DEFAULT_CLOSING_LINE = "There's always another memory waiting to be made.";
export const DEFAULT_CLOSING_SIGNOFF = "With all my love ♡";
export const DEFAULT_CLOSING_KICKER = "With All My Heart · دل کی بات";
export const DEFAULT_CLOSING_URDU = "تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے";

export interface ClosingMessageSectionProps {
  heading?: string;
  message?: string;
  closingLine?: string;
  signOff?: string;
  authorName?: string;
  urduBlessing?: string;
  onReturnToTop?: () => void;
  onReturnToBeginning?: () => void;
  onExploreMore?: () => void;
  className?: string;
}

export function ClosingMessageSection({
  heading = DEFAULT_CLOSING_HEADING,
  message = DEFAULT_CLOSING_MESSAGE,
  closingLine = DEFAULT_CLOSING_LINE,
  signOff = DEFAULT_CLOSING_SIGNOFF,
  authorName,
  urduBlessing = DEFAULT_CLOSING_URDU,
  onReturnToTop,
  onReturnToBeginning,
  onExploreMore,
  className = "",
}: ClosingMessageSectionProps): JSX.Element {
  const returnHandler = onReturnToBeginning || onReturnToTop;
  const handleScrollToTop = () => {
    if (returnHandler) {
      returnHandler();
    } else if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <section
      className={`closing-message-section ${className}`.trim()}
      aria-labelledby="closing-message-heading"
    >
      <div className="closing-letter-card">
        {/* Washi Tape across Top */}
        <div
          className="washi-tape washi-tape-pink washi-tape-top"
          aria-hidden="true"
        />

        {/* Kicker */}
        <span className="closing-kicker">{DEFAULT_CLOSING_KICKER}</span>

        {/* Heading */}
        <h2 id="closing-message-heading" className="closing-heading">
          {heading}
        </h2>

        {/* Urdu Blessing */}
        {urduBlessing && (
          <p className="closing-urdu-blessing" lang="ur" dir="rtl">
            {urduBlessing}
          </p>
        )}

        {/* Main Note */}
        <p className="closing-body-message">{message}</p>

        {/* Closing Line */}
        <p className="closing-line-phrase">&ldquo;{closingLine}&rdquo;</p>

        {/* Wax Seal Graphic (Rich SVG) */}
        <div className="closing-wax-seal-wrapper" aria-label="Crimson wax seal">
          <svg
            className="closing-wax-seal-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient
                id="waxGradient"
                cx="42%"
                cy="38%"
                r="55%"
                fx="35%"
                fy="30%"
              >
                <stop offset="0%" stopColor="#C93B57" />
                <stop offset="65%" stopColor="#871A30" />
                <stop offset="100%" stopColor="#4A0B18" />
              </radialGradient>
              <radialGradient
                id="waxRim"
                cx="50%"
                cy="50%"
                r="50%"
              >
                <stop offset="70%" stopColor="#731628" stopOpacity="0" />
                <stop offset="100%" stopColor="#2E040D" stopOpacity="0.8" />
              </radialGradient>
            </defs>

            {/* Organic wax seal drip edge */}
            <path
              d="M50 4 C64 3, 76 10, 84 18 C92 26, 98 40, 96 52 C94 65, 87 77, 78 86 C68 95, 52 98, 40 96 C28 94, 15 86, 9 75 C3 64, 2 50, 6 38 C10 24, 22 12, 34 6 Z"
              fill="url(#waxGradient)"
            />
            <path
              d="M50 4 C64 3, 76 10, 84 18 C92 26, 98 40, 96 52 C94 65, 87 77, 78 86 C68 95, 52 98, 40 96 C28 94, 15 86, 9 75 C3 64, 2 50, 6 38 C10 24, 22 12, 34 6 Z"
              fill="url(#waxRim)"
            />

            {/* Inner embossed stamp ring */}
            <circle
              cx="50"
              cy="50"
              r="30"
              stroke="#F4B8C5"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              strokeOpacity="0.55"
            />
            <circle
              cx="50"
              cy="50"
              r="26"
              stroke="#4A0B18"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />

            {/* Heart stamp mark in center */}
            <path
              d="M50 61 C50 61, 35 50, 35 41 C35 36, 39 32, 44 32 C47 32, 49 34, 50 36 C51 34, 53 32, 56 32 C61 32, 65 36, 65 41 C65 50, 50 61, 50 61 Z"
              fill="#F9D2DC"
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Signed Sign-off */}
        <p className="closing-signoff">{signOff}</p>
        {authorName && <p className="closing-author-name">{authorName}</p>}

        <div className="closing-letter-divider" aria-hidden="true" />

        {/* Action Controls */}
        <div className="closing-actions-row">
          <button
            type="button"
            className="closing-return-btn"
            onClick={handleScrollToTop}
            aria-label="Return to beginning"
          >
            <span>Return to beginning</span>
            <span aria-hidden="true">↑</span>
          </button>

          {onExploreMore && (
            <button
              type="button"
              className="closing-explore-btn"
              onClick={onExploreMore}
              aria-label="Explore more of your birthday world"
            >
              <span>Explore your world</span>
              <span aria-hidden="true">✿</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
