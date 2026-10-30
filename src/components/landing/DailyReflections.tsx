"use client";

import React, { useState, useId } from "react";
import type { JSX } from "react";
import "./daily-reflections.css";

export interface DailyReflectionItem {
  id: string;
  arabic: string;
  english: string;
  surah: string;
  reference: string;
  reflection: string;
  theme: string;
  mindfulnessPrompt: string;
  dailyAffirmation: string;
}

/**
 * Curated authentic Quranic verses with authentic Arabic text, standard English translation,
 * verified Surah name and verse citation numbers, and heartfelt reflections.
 * CONTENT INTEGRITY: Every verse is strictly sourced directly from the Holy Quran.
 */
export const AUTHENTIC_QURANIC_REFLECTIONS: DailyReflectionItem[] = [
  {
    id: "quran-94-5-6",
    surah: "Surah Ash-Sharh",
    reference: "94:5-6",
    theme: "Hope & Ease",
    arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    english: "For indeed, with hardship [will be] ease. Indeed, with hardship [will be] ease.",
    reflection:
      "No season of difficulty stands alone; ease is woven directly beside it. Take a gentle breath, knowing that relief and comfort are already unfolding.",
    mindfulnessPrompt:
      "Inhale slowly for four seconds, hold gently for four, and exhale completely. Let your shoulders soften as you surrender all tension.",
    dailyAffirmation: "I am surrounded by gentle ease, warmth, and quiet strength today.",
  },
  {
    id: "quran-13-28",
    surah: "Surah Ar-Ra'd",
    reference: "13:28",
    theme: "Inner Tranquility",
    arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    english: "Unquestionably, by the remembrance of Allah hearts are assured.",
    reflection:
      "When the noise and haste of the everyday feel heavy, stepping inward and reconnecting with the Divine brings an unshakable serenity to the soul.",
    mindfulnessPrompt:
      "Place a gentle hand over your heart. Close your eyes for one quiet minute and whisper a word of peace to yourself.",
    dailyAffirmation: "My heart is anchored in quiet tranquility and grounded trust.",
  },
  {
    id: "quran-2-152",
    surah: "Surah Al-Baqarah",
    reference: "2:152",
    theme: "Gratitude & Connection",
    arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    english: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.",
    reflection:
      "Gratitude transforms everyday moments into radiant blessings. In noticing even the smallest grace—morning light, a kind voice, a warm tea—life overflows.",
    mindfulnessPrompt:
      "Look around you and silently name three simple gifts you have received today with sincere gratitude.",
    dailyAffirmation: "I welcome today's blessings with a heart open to gratitude and joy.",
  },
  {
    id: "quran-2-286",
    surah: "Surah Al-Baqarah",
    reference: "2:286",
    theme: "Strength & Compassion",
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    english: "Allah does not burden a soul beyond that it can bear.",
    reflection:
      "You are never asked to carry more than your soul is gifted to hold. Be gentle with your pace; you possess all the resilience you need.",
    mindfulnessPrompt:
      "Release the urge to hold everything together at once. Doing your best with kindness toward yourself is more than enough.",
    dailyAffirmation: "I have the grace, resilience, and patience to walk through today calmly.",
  },
  {
    id: "quran-65-3",
    surah: "Surah At-Talaq",
    reference: "65:3",
    theme: "Trust & Peace of Mind",
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    english: "And whoever relies upon Allah - then He is sufficient for him.",
    reflection:
      "You do not need to figure out every turn of the road ahead today. Do what you can with sincerity, and let your heart rest in trust.",
    mindfulnessPrompt:
      "Identify one worry or future question. Visualize wrapping it in light and surrendering it gently from your mind.",
    dailyAffirmation: "I trust the unfolding of my journey and let go of unnecessary worry.",
  },
  {
    id: "quran-93-3",
    surah: "Surah Ad-Duha",
    reference: "93:3",
    theme: "Comfort & Reassurance",
    arabic: "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
    english: "Your Lord has not forsaken you, nor is He displeased.",
    reflection:
      "On quiet or overcast days when energy feels distant, remember you are never forgotten, unguided, or alone. Brighter dawn is promised.",
    mindfulnessPrompt:
      "Notice the sky above you or step near an open window. Feel the gentle air reminding you that each day brings a fresh beginning.",
    dailyAffirmation: "I am cherished, protected, and worthy of tenderness and peace.",
  },
  {
    id: "quran-14-7",
    surah: "Surah Ibrahim",
    reference: "14:7",
    theme: "Abundance & Growth",
    arabic: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
    english: "If you are grateful, I will surely increase you [in favor].",
    reflection:
      "A grateful perspective multiplies joy. Celebrate how far you have grown, and watch as peace and goodness blossom in every corner of your life.",
    mindfulnessPrompt:
      "Send a warm silent blessing or smile to someone who brought comfort to your heart recently.",
    dailyAffirmation: "With every grateful thought, peace and beauty multiply in my world.",
  },
  {
    id: "quran-3-139",
    surah: "Surah Ali 'Imran",
    reference: "3:139",
    theme: "Courage & Dignity",
    arabic: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ إِن كُنتُم مُّؤْمِنِينَ",
    english: "So do not weaken and do not grieve, and you will be superior if you are [true] believers.",
    reflection:
      "Never let fleeting moments of hesitation shake your inner beauty and courage. Hold your head high, cherish your values, and walk with dignity.",
    mindfulnessPrompt:
      "Stand tall, roll your shoulders back, and recall a time you met a challenge with elegance and grace.",
    dailyAffirmation: "I move forward with quiet confidence, self-respect, and graceful courage.",
  },
];

/**
 * Deterministically picks a reflection based on the day of the year.
 */
export function getReflectionForDate(
  date: Date = new Date(),
  reflections: DailyReflectionItem[] = AUTHENTIC_QURANIC_REFLECTIONS
): DailyReflectionItem {
  if (!reflections || reflections.length === 0) {
    throw new Error("Reflections array cannot be empty");
  }
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const safeIndex = Math.abs(diffDays) % reflections.length;
  return reflections[safeIndex];
}

/**
 * Gets a reflection by zero-based index with cyclic bounds.
 */
export function getReflectionByIndex(
  index: number,
  reflections: DailyReflectionItem[] = AUTHENTIC_QURANIC_REFLECTIONS
): DailyReflectionItem {
  if (!reflections || reflections.length === 0) {
    throw new Error("Reflections array cannot be empty");
  }
  const normalizedIndex = ((index % reflections.length) + reflections.length) % reflections.length;
  return reflections[normalizedIndex];
}

export interface DailyReflectionsProps {
  initialDate?: Date;
  reflections?: DailyReflectionItem[];
  onReflectionChange?: (reflection: DailyReflectionItem) => void;
}

export function DailyReflections({
  initialDate,
  reflections = AUTHENTIC_QURANIC_REFLECTIONS,
  onReflectionChange,
}: DailyReflectionsProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const defaultRef = getReflectionForDate(initialDate || new Date(), reflections);
    const foundIdx = reflections.findIndex((r) => r.id === defaultRef.id);
    return foundIdx >= 0 ? foundIdx : 0;
  });

  const [copied, setCopied] = useState(false);
  const sectionId = useId();

  const currentReflection = reflections[currentIndex] || reflections[0];

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % reflections.length;
    setCurrentIndex(nextIdx);
    onReflectionChange?.(reflections[nextIdx]);
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + reflections.length) % reflections.length;
    setCurrentIndex(prevIdx);
    onReflectionChange?.(reflections[prevIdx]);
  };

  const handleCopy = async () => {
    const textToCopy = `"${currentReflection.english}"\n— ${currentReflection.surah} (${currentReflection.reference})\n\n"${currentReflection.arabic}"\n\nDaily Reflection: ${currentReflection.reflection}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch {
      // Fallback non-critical
    }
  };

  return (
    <section
      className="daily-reflections-section"
      aria-labelledby={`daily-reflections-title-${sectionId}`}
      data-testid="daily-reflections-section"
    >
      <div className="reflections-container-card">
        {/* Washi tape accents */}
        <div className="washi-tape washi-tape-sage reflections-washi-top-left" aria-hidden="true" />
        <div className="washi-tape washi-tape-pink reflections-washi-top-right" aria-hidden="true" />

        {/* Section Header */}
        <header className="reflections-header">
          <div className="reflections-kicker">
            <span className="reflections-kicker-flower" aria-hidden="true">✿</span>
            <span>Everyday Sanctuary · روزانہ کا سکون</span>
            <span className="reflections-kicker-flower" aria-hidden="true">✿</span>
          </div>
          <h2 id={`daily-reflections-title-${sectionId}`} className="reflections-title">
            Daily Reflections & <em>Mental Wellbeing</em>
          </h2>
          <p className="reflections-subtitle">
            A quiet sanctuary for your morning and evening. Authentic Quranic verses, gentle reflections,
            and mindful reminders to fill your day with peace.
          </p>
        </header>

        {/* Main Grid: Quranic Verse & Wellbeing Cards */}
        <div className="reflections-main-grid">
          {/* Card 1: Quranic Verse & Reflection */}
          <article className="verse-highlight-card" aria-label="Daily Quranic Reflection">
            <div>
              {/* Theme & Reference */}
              <div className="verse-theme-badge-row">
                <span className="verse-theme-pill">{currentReflection.theme}</span>
                <span className="verse-reference-chip" title={`${currentReflection.surah} verse ${currentReflection.reference}`}>
                  📖 {currentReflection.surah} ({currentReflection.reference})
                </span>
              </div>

              {/* Authentic Arabic Text */}
              <div
                className="verse-arabic-display"
                lang="ar"
                dir="rtl"
                aria-label={`Arabic text from ${currentReflection.surah}`}
              >
                {currentReflection.arabic}
              </div>

              {/* English Translation */}
              <blockquote className="verse-translation-quote">
                &ldquo;{currentReflection.english}&rdquo;
              </blockquote>

              {/* Heartfelt Reflection */}
              <div className="verse-reflection-body">
                <strong>Gentle Reflection · دل کا سکون</strong>
                {currentReflection.reflection}
              </div>
            </div>

            {/* Actions: Navigation & Copy */}
            <div className="reflections-card-actions">
              <div className="reflections-nav-buttons">
                <button
                  type="button"
                  className="reflection-nav-btn"
                  onClick={handlePrev}
                  aria-label="Previous reflection"
                >
                  <span aria-hidden="true">←</span> Previous
                </button>
                <button
                  type="button"
                  className="reflection-nav-btn"
                  onClick={handleNext}
                  aria-label="Next reflection"
                >
                  Next <span aria-hidden="true">→</span>
                </button>
              </div>

              <button
                type="button"
                className="reflection-copy-btn"
                onClick={handleCopy}
                aria-label="Copy verse and reflection"
              >
                <span>{copied ? "✓ Copied to clipboard" : "📋 Share / Copy Verse"}</span>
              </button>
            </div>
          </article>

          {/* Card 2: Mental Wellbeing & Serenity Companion */}
          <aside className="wellbeing-companion-card" aria-label="Mental Wellbeing & Mindful Pause">
            <div>
              <div className="wellbeing-header-badge">
                <span aria-hidden="true">🌿</span>
                <span>Mindful Pause & Wellbeing</span>
              </div>

              {/* Serene Breathing Flower */}
              <div className="breathing-serenity-container" style={{ marginTop: "16px" }}>
                <div className="breathing-flower-visual" aria-hidden="true">
                  ✿
                </div>
                <p className="breathing-instruction">Breathe with the flower</p>
                <p className="breathing-subtext">Expand on inhale · Soften on exhale</p>
              </div>

              {/* Mindful prompt box */}
              <div className="mindful-prompt-box" style={{ marginTop: "16px" }}>
                <h3 className="mindful-prompt-heading">Today&apos;s Mindful Practice</h3>
                <p className="mindful-prompt-text">{currentReflection.mindfulnessPrompt}</p>
              </div>
            </div>

            {/* Affirmation Note */}
            <div className="wellbeing-affirmation-note">
              <strong>Daily Affirmation:</strong> &ldquo;{currentReflection.dailyAffirmation}&rdquo;
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default DailyReflections;
