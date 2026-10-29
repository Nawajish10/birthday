"use client";

import React, { useState, useRef, useCallback, type JSX } from "react";
import "./personal-messages.css";

/**
 * ============================================================================
 * Section 4: Personal Messages & Poetry — Types & Contracts
 * ============================================================================
 */

export interface PersonalMessageCard {
  id: string;
  title: string;
  body_en: string;
  body_ur?: string;
  category?: string;
  date?: string;
  author?: string;
  sealColor?: "pink" | "gold" | "sage";
}

export interface PersonalMessagesSectionProps {
  cards?: readonly PersonalMessageCard[] | PersonalMessageCard[];
  heading?: string;
  supportingText?: string;
  initialIndex?: number;
  onCardChange?: (index: number, card: PersonalMessageCard) => void;
  className?: string;
  allowEmptyState?: boolean;
}

export const DEFAULT_HEADING = "A few things from my heart.";
export const DEFAULT_SUPPORTING_TEXT = "Some things deserve more than a simple birthday wish.";
export const MESSAGE_SWIPE_THRESHOLD_PX = 45;

/**
 * Curated default heartfelt birthday messages, Urdu poetry, and prayers for Meerah
 */
export const DEFAULT_PERSONAL_MESSAGES: readonly PersonalMessageCard[] = [
  {
    id: "msg-1",
    title: "To the Light in Every Room",
    category: "Birthday Wish · سالگرہ مبارک",
    body_en:
      "Happy Birthday, Meerah. Watching you bring warmth, kindness, and light to everyone around you is one of the greatest blessings. May this new year of your life be filled with gentle peace, deep laughter, and beautiful surprises around every corner.",
    body_ur:
      "تمہاری سالگرہ کا ہر لمحہ محبت، سکون اور روشنی سے بھرا رہے۔ تم جہاں بھی جاؤ، خوشیاں اور آسانیاں تمہارا استقبال کریں۔ سالگرہ بہت بہت مبارک ہو!",
    date: "October 30",
    author: "With all my heart",
    sealColor: "pink",
  },
  {
    id: "msg-2",
    title: "A Timeless Ghazal Verse",
    category: "Poetry · خوبصورت شعر",
    body_en:
      "Some souls do not just walk through life; they leave a trail of gentle starlight behind them. Wherever you journey, may you remember that your wings were made for the highest skies.",
    body_ur:
      "ستاروں سے آگے جہاں اور بھی ہیں\nابھی عشق کے امتحان اور بھی ہیں\nتو شاہیں ہے، پرواز ہے کام تیرا\nتیرے سامنے آسماں اور بھی ہیں",
    date: "Allama Iqbal",
    author: "A verse for your journey",
    sealColor: "gold",
  },
  {
    id: "msg-3",
    title: "A Quiet Prayer for Your Path",
    category: "Prayer & Blessing · دلی دعا",
    body_en:
      "Whenever the road feels uncertain or the days feel long, I pray that you always feel protected, deeply cherished, and confident in your own extraordinary strength. You are never walking alone.",
    body_ur:
      "دعا ہے کہ زندگی کا ہر موڑ تمہارے لیے آسانیاں، قلبی سکون اور سچی خوشیاں لائے۔ تمہارا مسکراتا چہرہ ہمیشہ یونہی کھلتا رہے، آمین۔",
    date: "Always & forever",
    author: "A silent prayer",
    sealColor: "sage",
  },
  {
    id: "msg-4",
    title: "Gratitude for the Journey",
    category: "Keepsake · شکر گزاری",
    body_en:
      "Thank you for the honesty of your laughter, for listening when words are hard to find, and for being the most genuine person I have ever known. Celebrating you today is the easiest thing in the world.",
    body_ur:
      "تمہارا وجود ہماری زندگیوں میں ایک خوبصورت تحفہ ہے۔ تم جیسی ہو، ویسی ہی رہنا—بے لوث، سچی اور بے حد عزیز۔",
    date: "October 30",
    author: "Always in your corner",
    sealColor: "pink",
  },
] as const;

/**
 * Pure Domain Helpers
 */

export function resolvePersonalMessages(
  cards?: readonly PersonalMessageCard[] | PersonalMessageCard[],
  allowEmpty: boolean = false
): PersonalMessageCard[] {
  if (cards === undefined) {
    return [...DEFAULT_PERSONAL_MESSAGES];
  }
  if (Array.isArray(cards)) {
    if (cards.length === 0 && !allowEmpty) {
      return [...DEFAULT_PERSONAL_MESSAGES];
    }
    return [...cards];
  }
  return [...DEFAULT_PERSONAL_MESSAGES];
}

export function clampMessageIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}

export function getNextMessageIndex(current: number, total: number, wrap: boolean = true): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current + 1) % total;
  }
  return Math.min(current + 1, total - 1);
}

export function getPrevMessageIndex(current: number, total: number, wrap: boolean = true): number {
  if (total <= 0) return 0;
  if (wrap) {
    return (current - 1 + total) % total;
  }
  return Math.max(current - 1, 0);
}

export function calculateSwipeDirection(
  startX: number,
  endX: number,
  threshold: number = MESSAGE_SWIPE_THRESHOLD_PX
): "next" | "prev" | "none" {
  const deltaX = startX - endX;
  if (Math.abs(deltaX) < threshold) {
    return "none";
  }
  return deltaX > 0 ? "next" : "prev";
}

export function resolveSealColor(
  sealColor?: "pink" | "gold" | "sage",
  index: number = 0
): "pink" | "gold" | "sage" {
  if (sealColor === "pink" || sealColor === "gold" || sealColor === "sage") {
    return sealColor;
  }
  const colors: ("pink" | "gold" | "sage")[] = ["pink", "gold", "sage"];
  return colors[index % colors.length];
}

/**
 * PersonalMessagesSection Component
 * Interactive card stack for heartfelt personal messages, birthday wishes, and poetry.
 */
export function PersonalMessagesSection({
  cards,
  heading = DEFAULT_HEADING,
  supportingText = DEFAULT_SUPPORTING_TEXT,
  initialIndex = 0,
  onCardChange,
  className = "",
  allowEmptyState = false,
}: PersonalMessagesSectionProps): JSX.Element {
  const resolvedCards = resolvePersonalMessages(cards, allowEmptyState);
  const totalCards = resolvedCards.length;

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    clampMessageIndex(initialIndex, totalCards)
  );

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      const bounded = clampMessageIndex(index, totalCards);
      setActiveIndex(bounded);
      if (onCardChange && resolvedCards[bounded]) {
        onCardChange(bounded, resolvedCards[bounded]);
      }
    },
    [totalCards, onCardChange, resolvedCards]
  );

  const goNext = useCallback(() => {
    goTo(getNextMessageIndex(activeIndex, totalCards, true));
  }, [activeIndex, totalCards, goTo]);

  const goPrev = useCallback(() => {
    goTo(getPrevMessageIndex(activeIndex, totalCards, true));
  }, [activeIndex, totalCards, goTo]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (totalCards <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(totalCards - 1);
      }
    },
    [totalCards, goPrev, goNext, goTo]
  );

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || e.changedTouches.length === 0) return;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current ?? endY;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const deltaX = Math.abs(startX - endX);
    const deltaY = Math.abs(startY - endY);

    if (deltaX >= deltaY) {
      const direction = calculateSwipeDirection(startX, endX, MESSAGE_SWIPE_THRESHOLD_PX);
      if (direction === "next") {
        goNext();
      } else if (direction === "prev") {
        goPrev();
      }
    }
  };

  // Empty state handling
  if (totalCards === 0) {
    return (
      <section
        className={`personal-messages-section is-empty ${className}`}
        aria-label="Personal Messages and Poetry — No Messages Available"
      >
        <div className="personal-messages-header">
          <span className="personal-messages-kicker">HEARTFELT NOTES · دلی پیغامات</span>
          <h2 className="personal-messages-heading">{heading}</h2>
          <p className="personal-messages-supporting">{supportingText}</p>
        </div>
        <div className="personal-messages-empty-card" role="status">
          <div className="washi-tape washi-tape-pink washi-pos-center" aria-hidden="true" />
          <span className="empty-message-seal" aria-hidden="true">💌</span>
          <h3 className="empty-message-title">No personal messages yet</h3>
          <p className="empty-message-description">
            Heartfelt birthday letters, poetry, and blessings will appear here.
          </p>
        </div>
      </section>
    );
  }

  const activeCard = resolvedCards[activeIndex];
  const sealColor = resolveSealColor(activeCard.sealColor, activeIndex);

  return (
    <section
      className={`personal-messages-section ${className}`}
      aria-label="Personal Messages and Poetry"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Section Header */}
      <div className="personal-messages-header">
        <div className="messages-kicker-row">
          <span className="personal-messages-kicker">HEARTFELT NOTES · دلی پیغامات</span>
          <span className="messages-counter-badge" aria-live="polite">
            Card {activeIndex + 1} of {totalCards}
          </span>
        </div>
        <h2 className="personal-messages-heading">{heading}</h2>
        <p className="personal-messages-supporting">{supportingText}</p>
      </div>

      {/* Card Stack Deck Viewport */}
      <div className="personal-card-deck-container">
        {/* Decorative backdrop cards giving tactile stacked paper feel */}
        <div className="deck-card-ghost deck-card-back" aria-hidden="true" />
        <div className="deck-card-ghost deck-card-middle" aria-hidden="true" />

        {/* Primary Interactive Message Card */}
        <article
          key={activeCard.id}
          className="message-card-active"
          aria-roledescription="card"
          aria-label={`Message ${activeIndex + 1} of ${totalCards}: ${activeCard.title}`}
        >
          {/* Washi Tape Accent */}
          <div
            className={`washi-tape washi-tape-${sealColor} washi-pos-center message-card-tape`}
            aria-hidden="true"
          />

          {/* Top category ribbon & seal */}
          <div className="message-card-topbar">
            {activeCard.category && (
              <span className={`message-category-chip chip-${sealColor}`}>
                <span className="category-symbol" aria-hidden="true">✦</span>
                {activeCard.category}
              </span>
            )}
            <div className="message-wax-seal" aria-hidden="true">
              <span className="wax-seal-icon">❦</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="message-card-title">{activeCard.title}</h3>

          {/* English Message Body */}
          <div className="message-card-body-en">
            <p>{activeCard.body_en}</p>
          </div>

          {/* Urdu Message Body & Poetry (RTL with bidirectional isolation) */}
          {activeCard.body_ur && (
            <div className="message-card-urdu-container">
              <div className="message-card-divider" aria-hidden="true">
                <span className="divider-line" />
                <span className="divider-ornament">✿</span>
                <span className="divider-line" />
              </div>

              {/* Strict Urdu typography attributes: dir='rtl', lang='ur' */}
              <blockquote
                className="message-card-urdu-text"
                lang="ur"
                dir="rtl"
              >
                {activeCard.body_ur.split("\n").map((line, idx) => (
                  <span key={idx} className="urdu-verse-line">
                    {line}
                  </span>
                ))}
              </blockquote>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="message-card-footer">
            {activeCard.author && (
              <span className="message-author">
                <span className="author-icon" aria-hidden="true">♡</span>
                {activeCard.author}
              </span>
            )}
            {activeCard.date && (
              <span className="message-date">{activeCard.date}</span>
            )}
          </div>
        </article>
      </div>

      {/* Navigation Controls */}
      <div className="messages-controls-bar">
        <button
          type="button"
          className="messages-nav-btn messages-nav-prev"
          onClick={goPrev}
          aria-label="Previous message"
        >
          <span aria-hidden="true">←</span>
          <span className="btn-label">Previous Note</span>
        </button>

        {/* Tab / Dot Indicator Pills */}
        <div
          className="messages-pills-row"
          role="tablist"
          aria-label="Select a personal message"
        >
          {resolvedCards.map((card, i) => (
            <button
              key={card.id || `msg-pill-${i}`}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Read ${card.title} (${i + 1} of ${totalCards})`}
              className={`messages-pill ${i === activeIndex ? "active" : ""}`}
              onClick={() => goTo(i)}
            >
              <span className="pill-dot" />
              <span className="pill-text">{card.title.slice(0, 14)}...</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="messages-nav-btn messages-nav-next"
          onClick={goNext}
          aria-label="Next message"
        >
          <span className="btn-label">Next Note</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      {/* Touch swipe guide for mobile users */}
      <div className="messages-swipe-hint" aria-hidden="true">
        <span>← Swipe across the letter or use arrows to flip notes →</span>
      </div>
    </section>
  );
}
