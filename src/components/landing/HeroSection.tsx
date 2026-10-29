"use client";

import React, { useState } from "react";
import type { JSX } from "react";
import "./hero-section.css";

export const DEFAULT_RECIPIENT_NAME = "Meerah";
export const DEFAULT_BIRTHDAY_DATE = "October 30";
export const DEFAULT_URDU_BLESSING = "تمہاری سالگرہ کا ہر لمحہ محبت اور روشنی سے بھرا رہے";

export interface HeroSectionProps {
  recipientName?: string; // Default: "Meerah"
  birthdayDate?: string; // Default: "October 30"
  onOpenWorld: () => void;
  avatarUrl?: string; // Optional future real avatar photo
}

/**
 * Helper to resolve props with defaults
 */
export function resolveHeroProps(props: Partial<HeroSectionProps> = {}): {
  recipientName: string;
  birthdayDate: string;
  onOpenWorld?: () => void;
  avatarUrl?: string;
} {
  return {
    recipientName: props.recipientName?.trim() || DEFAULT_RECIPIENT_NAME,
    birthdayDate: props.birthdayDate?.trim() || DEFAULT_BIRTHDAY_DATE,
    onOpenWorld: props.onOpenWorld,
    avatarUrl: props.avatarUrl,
  };
}

/**
 * Section 1 — Welcome Hero of the 2D Scrapbook Landing Page.
 * Features:
 * - Handcrafted scrapbook card surface with washi tape accents
 * - Personalized greeting and celebration kicker
 * - Symbolic floral cameo wreath (sunflowers, pink roses, white jasmine/daisies)
 * - Elegant Urdu birthday blessing with proper RTL layout
 * - Primary "Open your little world ↓" CTA
 * - Floating petals & sparkles respecting prefers-reduced-motion
 */
export function HeroSection({
  recipientName = DEFAULT_RECIPIENT_NAME,
  birthdayDate = DEFAULT_BIRTHDAY_DATE,
  onOpenWorld,
  avatarUrl,
}: HeroSectionProps): JSX.Element {
  const [avatarError, setAvatarError] = useState(false);
  const activeRecipient = recipientName?.trim() || DEFAULT_RECIPIENT_NAME;
  const activeDate = birthdayDate?.trim() || DEFAULT_BIRTHDAY_DATE;
  const showPhoto = Boolean(avatarUrl && !avatarError);

  return (
    <section
      className="hero-section"
      aria-label="Birthday greeting for Meerah"
      data-testid="hero-section"
    >
      {/* Decorative floating petals background */}
      <div className="hero-petals-container" aria-hidden="true">
        <span className="hero-floating-petal petal-sunflower petal-pos-1">🌻</span>
        <span className="hero-floating-petal petal-rose petal-pos-2">🌸</span>
        <span className="hero-floating-petal petal-jasmine petal-pos-3">❀</span>
        <span className="hero-floating-petal petal-leaf petal-pos-4">🍃</span>
        <span className="hero-sparkle sparkle-pos-1">✦</span>
        <span className="hero-sparkle sparkle-pos-2">✧</span>
        <span className="hero-sparkle sparkle-pos-3">⋆</span>
      </div>

      {/* Main scrapbook paper card */}
      <div className="hero-card">
        {/* Washi tape accents */}
        <div className="washi-tape washi-top-left" aria-hidden="true" />
        <div className="washi-tape washi-tape-pink washi-top-right" aria-hidden="true" />

        {/* Top date kicker */}
        <div className="hero-kicker-wrapper">
          <p className="hero-kicker" data-testid="hero-kicker">
            <span className="hero-kicker-mark" aria-hidden="true">✿</span>
            <span>BIRTHDAY · {activeDate.toUpperCase()} · </span>
            <span lang="ur" dir="rtl" className="hero-kicker-urdu">
              سالگرہ مبارک
            </span>
          </p>
        </div>

        {/* Content grid: Avatar Cameo & Personal Greeting */}
        <div className="hero-content-grid">
          {/* Avatar Cameo Column */}
          <div className="hero-avatar-column">
            <div
              className="hero-avatar-cameo-wrapper"
              data-testid="hero-avatar-frame"
              aria-label={`${activeRecipient}'s portrait cameo`}
            >
              {/* Outer decorative washi tape on portrait */}
              <div className="washi-tape washi-tape-sage washi-cameo-top" aria-hidden="true" />

              {/* Center Portrait / Real Photo / Symbolic 2D Silhouette */}
              <div className="hero-cameo-center">
                {showPhoto ? (
                  <img
                    src={avatarUrl}
                    alt={`${activeRecipient}'s avatar`}
                    className="hero-avatar-real-photo"
                    decoding="async"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <svg
                    className="hero-symbolic-silhouette"
                    viewBox="0 0 160 160"
                    aria-label={`Symbolic avatar illustration for ${activeRecipient}`}
                    role="img"
                  >
                    <title>{`${activeRecipient}'s celebratory silhouette`}</title>
                    <defs>
                      <radialGradient id="cameoBgGradient" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#FFF9EF" />
                        <stop offset="70%" stopColor="#F8E8EC" />
                        <stop offset="100%" stopColor="#EADBCE" />
                      </radialGradient>
                      <linearGradient id="silhouetteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#624752" />
                        <stop offset="100%" stopColor="#3D2B33" />
                      </linearGradient>
                    </defs>
                    {/* Cameo inner background */}
                    <circle cx="80" cy="80" r="76" fill="url(#cameoBgGradient)" />
                    <circle cx="80" cy="80" r="74" fill="none" stroke="#EADBCE" strokeWidth="1.5" strokeDasharray="3 3" />

                    {/* Stylized Papercut Profile / Silhouette */}
                    <g fill="url(#silhouetteGradient)">
                      {/* Shoulders */}
                      <path d="M 30 150 C 35 125, 55 115, 80 115 C 105 115, 125 125, 130 150 Z" />
                      {/* Neck */}
                      <path d="M 72 100 L 88 100 L 86 118 L 74 118 Z" opacity="0.9" />
                      {/* Head and hair contour */}
                      <path d="M 80 40 C 62 40, 52 54, 52 74 C 52 94, 64 104, 80 104 C 96 104, 108 94, 108 74 C 108 54, 98 40, 80 40 Z" />
                      {/* Flowing locks */}
                      <path d="M 52 70 C 46 82, 48 105, 56 122 C 59 110, 60 90, 55 75 Z" opacity="0.85" />
                      <path d="M 108 70 C 114 82, 112 105, 104 122 C 101 110, 100 90, 105 75 Z" opacity="0.85" />
                    </g>

                    {/* Floral Hair Adornment */}
                    <g className="cameo-hair-flowers" aria-hidden="true">
                      {/* Sunflower hair clip */}
                      <circle cx="62" cy="52" r="5" fill="#F1C75B" />
                      <circle cx="62" cy="52" r="2.2" fill="#624752" />
                      {/* Rose hair clip */}
                      <circle cx="56" cy="60" r="4" fill="#D4798D" />
                      <circle cx="56" cy="60" r="2" fill="#F8E8EC" />
                      {/* White jasmine flower */}
                      <circle cx="68" cy="46" r="3.5" fill="#FFFFFF" stroke="#EADBCE" strokeWidth="0.5" />
                      <circle cx="68" cy="46" r="1.2" fill="#F1C75B" />
                    </g>
                  </svg>
                )}
              </div>

              {/* Floral Wreath Frame SVG (Sunflowers, Pink Roses, White Jasmine/Daisies, Leaves) */}
              <svg
                className="hero-wreath-svg"
                viewBox="0 0 280 280"
                aria-hidden="true"
                role="presentation"
              >
                {/* Wreath foliage loop */}
                <circle
                  cx="140"
                  cy="140"
                  r="110"
                  fill="none"
                  stroke="#EADBCE"
                  strokeWidth="2.5"
                  strokeDasharray="4 6"
                />

                {/* Soft Sage Leaves */}
                <g className="wreath-leaves" fill="#376E58" opacity="0.85">
                  <path d="M 45 110 C 35 95, 45 80, 55 90 C 65 100, 55 115, 45 110 Z" fill="#E5EDE2" stroke="#376E58" strokeWidth="1" />
                  <path d="M 235 110 C 245 95, 235 80, 225 90 C 215 100, 225 115, 235 110 Z" fill="#E5EDE2" stroke="#376E58" strokeWidth="1" />
                  <path d="M 80 225 C 70 235, 60 220, 72 212 C 84 204, 88 215, 80 225 Z" fill="#376E58" />
                  <path d="M 200 225 C 210 235, 220 220, 208 212 C 196 204, 192 215, 200 225 Z" fill="#376E58" />
                  <path d="M 120 32 C 112 20, 130 18, 135 28 C 140 38, 128 40, 120 32 Z" fill="#376E58" />
                  <path d="M 160 32 C 168 20, 150 18, 145 28 C 140 38, 152 40, 160 32 Z" fill="#E5EDE2" stroke="#376E58" strokeWidth="1" />
                </g>

                {/* 1. Sunflower Motifs (Golden Petals, Warm Brown Center) */}
                <g className="floral-sunflower-motif" data-motif="sunflower">
                  {/* Top center sunflower */}
                  <g transform="translate(140, 36)">
                    {/* Petals */}
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                      <ellipse
                        key={deg}
                        cx="0"
                        cy="-16"
                        rx="4.5"
                        ry="9"
                        fill="#F1C75B"
                        stroke="#C69325"
                        strokeWidth="0.8"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                    {/* Center disk */}
                    <circle cx="0" cy="0" r="10" fill="#624752" />
                    <circle cx="0" cy="0" r="7.5" fill="#3D2B33" />
                    <circle cx="0" cy="0" r="5" fill="#C69325" opacity="0.6" />
                  </g>

                  {/* Bottom right accent sunflower */}
                  <g transform="translate(216, 185) scale(0.75)">
                    {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => (
                      <ellipse
                        key={deg}
                        cx="0"
                        cy="-14"
                        rx="4"
                        ry="8"
                        fill="#F1C75B"
                        stroke="#C69325"
                        strokeWidth="0.7"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                    <circle cx="0" cy="0" r="8" fill="#624752" />
                    <circle cx="0" cy="0" r="5" fill="#3D2B33" />
                  </g>
                </g>

                {/* 2. Pink Rose Motifs (Rose Pink, Deep Rose Petals) */}
                <g className="floral-rose-motif" data-motif="rose">
                  {/* Bottom left grand rose */}
                  <g transform="translate(64, 185)">
                    <circle cx="0" cy="0" r="18" fill="#F8E8EC" stroke="#D4798D" strokeWidth="1" />
                    <circle cx="-2" cy="-2" r="13" fill="#D4798D" opacity="0.9" />
                    <path
                      d="M -8 -4 C -6 -12, 6 -12, 8 -4 C 10 4, 2 10, -4 8 C -10 6, -10 0, -8 -4 Z"
                      fill="#F8E8EC"
                    />
                    <path
                      d="M -3 -1 C -2 -5, 3 -5, 4 -1 C 5 3, 1 5, -2 4 Z"
                      fill="#D4798D"
                    />
                    <circle cx="0" cy="0" r="3" fill="#624752" />
                  </g>

                  {/* Top right companion rose */}
                  <g transform="translate(215, 78) scale(0.8)">
                    <circle cx="0" cy="0" r="15" fill="#F8E8EC" stroke="#D4798D" strokeWidth="1" />
                    <circle cx="1" cy="-1" r="11" fill="#D4798D" />
                    <path
                      d="M -6 -3 C -5 -9, 5 -9, 6 -3 C 8 3, 2 8, -3 6 Z"
                      fill="#F8E8EC"
                    />
                    <circle cx="0" cy="0" r="2.5" fill="#624752" />
                  </g>
                </g>

                {/* 3. White Jasmine & Daisy Motifs (White Petals, Gold Core) */}
                <g className="floral-white-flower-motif" data-motif="white-flower">
                  {/* Top left white daisy */}
                  <g transform="translate(68, 76)">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <ellipse
                        key={deg}
                        cx="0"
                        cy="-12"
                        rx="3.5"
                        ry="7"
                        fill="#FFFFFF"
                        stroke="#EADBCE"
                        strokeWidth="0.8"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                    <circle cx="0" cy="0" r="6" fill="#F1C75B" stroke="#C69325" strokeWidth="0.6" />
                  </g>

                  {/* Bottom center delicate white jasmine */}
                  <g transform="translate(140, 246) scale(0.9)">
                    {[0, 72, 144, 216, 288].map((deg) => (
                      <ellipse
                        key={deg}
                        cx="0"
                        cy="-11"
                        rx="4.2"
                        ry="8"
                        fill="#FFFFFF"
                        stroke="#EADBCE"
                        strokeWidth="0.8"
                        transform={`rotate(${deg})`}
                      />
                    ))}
                    <circle cx="0" cy="0" r="5" fill="#F1C75B" />
                  </g>

                  {/* Small white floral accents */}
                  <circle cx="106" cy="48" r="4.5" fill="#FFFFFF" stroke="#EADBCE" strokeWidth="0.5" />
                  <circle cx="106" cy="48" r="1.5" fill="#F1C75B" />
                  <circle cx="174" cy="48" r="4.5" fill="#FFFFFF" stroke="#EADBCE" strokeWidth="0.5" />
                  <circle cx="174" cy="48" r="1.5" fill="#F1C75B" />
                </g>
              </svg>
            </div>
            <p className="hero-avatar-caption">✿ Made with love · Keepsake No. 1</p>
          </div>

          {/* Text & Action Column */}
          <div className="hero-text-column">
            {/* Expressive Serif Heading */}
            <h1 className="hero-heading" data-testid="hero-heading">
              <span className="hero-heading-lead">Happy Birthday, {activeRecipient}</span>
              <span className="hero-heading-main">
                Today is all <em>yours</em>, {activeRecipient}
              </span>
              <span className="hero-heading-sub">A little world, made with love.</span>
            </h1>

            {/* Short English Description */}
            <p className="hero-english-copy">
              Step into a handwritten scrapbook crafted petal by petal just for you. Every smile,
              cherished memory, and little wish from the year is waiting inside.
            </p>

            {/* Elegant Urdu Blessing with proper RTL layout */}
            <div
              className="hero-urdu-card"
              lang="ur"
              dir="rtl"
              data-testid="hero-urdu"
            >
              <span className="hero-urdu-flower" aria-hidden="true">❀</span>
              <p className="hero-urdu-blessing">
                {DEFAULT_URDU_BLESSING}
              </p>
              <span className="hero-urdu-flower" aria-hidden="true">❀</span>
            </div>

            {/* Primary Call-to-Action */}
            <div className="hero-cta-wrapper">
              <button
                type="button"
                className="hero-cta-button"
                onClick={onOpenWorld}
                data-testid="hero-cta"
                aria-label="Open your little world"
              >
                <span className="hero-cta-label">Open your little world</span>
                <span className="hero-cta-arrow" aria-hidden="true">
                  ↓
                </span>
              </button>
              <p className="hero-cta-hint">Let&apos;s begin — turn the page to enter your birthday scrapbook world</p>
            </div>
          </div>
        </div>

        {/* Card bottom deckle aesthetic & stamp */}
        <div className="hero-card-footer" aria-hidden="true">
          <span className="hero-footer-deckle">✦ · ✿ · ✦</span>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
