"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface WordHuntProps {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

interface HuntWord {
  word: string;
  clue: string;
  urduHint: string;
}

const HUNT_WORDS: HuntWord[] = [
  {
    word: "SUNFLOWER",
    clue: "Bright, blooming flower that always turns toward the golden light 🌻",
    urduHint: "سورج مکھی کا پھول جو روشنی کی طرف رخ کرتا ہے",
  },
  {
    word: "SUNSHINE",
    clue: "The radiant warmth Meerah brings into every heart and room ☀️",
    urduHint: "صبح کی وہ پیاری دھوپ جو دل کو مسرت بخشتی ہے",
  },
  {
    word: "CUPCAKE",
    clue: "Sweet frosted birthday treat baked with pure delight 🧁",
    urduHint: "سالگرہ کی سب سے میٹھی اور لذیذ مٹھاس",
  },
  {
    word: "MEMORIES",
    clue: "Treasured moments of shared laughter we cherish forever 📸",
    urduHint: "وہ انمول لمحات جنہیں دل ہمیشہ سنبھال کر رکھتا ہے",
  },
  {
    word: "CELEBRATION",
    clue: "A joyful gathering filled with music, smiles, and birthday cake 🎈",
    urduHint: "خوشیوں اور گیتوں سے سجی ایک خوبصورت شام",
  },
  {
    word: "RADIANT",
    clue: "Glowing with graceful elegance, kindness, and eternal beauty ✨",
    urduHint: "جس کے چہرے پر ہمیشہ نور اور تبسم جگمگائے",
  },
  {
    word: "LAUGHTER",
    clue: "Contagious, musical joy that echoes through our sweetest days 💖",
    urduHint: "وہ کھلکھلاتی ہنسی جو اداسیوں کو مٹا دے",
  },
  {
    word: "BLOSSOM",
    clue: "Springtime petals blooming in honor of your special day 🌸",
    urduHint: "بہار کے وہ تازہ شگوفے جو خوشبوئیں بکھیرتے ہیں",
  },
];

function scramble(word: string): string[] {
  const chars = word.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  // Ensure it's not identical to original
  if (chars.join("") === word && chars.length > 1) {
    const temp = chars[0];
    chars[0] = chars[chars.length - 1];
    chars[chars.length - 1] = temp;
  }
  return chars;
}

export function WordHunt({ onComplete, onRestart }: WordHuntProps) {
  const [wordIndex, setWordIndex] = useState<number>(0);
  const [scrambled, setScrambled] = useState<string[]>(() =>
    scramble(HUNT_WORDS[0].word)
  );
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [guess, setGuess] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [hintsLeft, setHintsLeft] = useState<number>(3);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isWordSolved, setIsWordSolved] = useState<boolean>(false);
  const [isGameCompleted, setIsGameCompleted] = useState<boolean>(false);

  const currentItem = HUNT_WORDS[wordIndex];

  const handleTileClick = (idx: number) => {
    if (selectedIndices.includes(idx) || isWordSolved) return;
    const nextIndices = [...selectedIndices, idx];
    setSelectedIndices(nextIndices);
    setGuess(nextIndices.map((i) => scrambled[i]).join(""));
    setFeedback(null);
  };

  const handleUndo = () => {
    if (selectedIndices.length === 0 || isWordSolved) return;
    const nextIndices = selectedIndices.slice(0, -1);
    setSelectedIndices(nextIndices);
    setGuess(nextIndices.map((i) => scrambled[i]).join(""));
    setFeedback(null);
  };

  const handleClear = () => {
    if (isWordSolved) return;
    setSelectedIndices([]);
    setGuess("");
    setFeedback(null);
  };

  const handleHint = () => {
    if (hintsLeft <= 0 || isWordSolved) return;
    // Reveal next correct letter
    const target = currentItem.word;
    const currentLen = guess.length;
    if (currentLen < target.length) {
      const nextChar = target[currentLen];
      // Find an unused scrambled index with this char
      const availableIndex = scrambled.findIndex(
        (char, idx) => char === nextChar && !selectedIndices.includes(idx)
      );
      if (availableIndex !== -1) {
        const nextIndices = [...selectedIndices, availableIndex];
        setSelectedIndices(nextIndices);
        setGuess(nextIndices.map((i) => scrambled[i]).join(""));
        setHintsLeft((h) => h - 1);
        setFeedback(`Hint: Next letter is "${nextChar}"!`);
      }
    }
  };

  const handleShuffle = () => {
    if (isWordSolved) return;
    setSelectedIndices([]);
    setGuess("");
    setScrambled(scramble(currentItem.word));
  };

  const handleSubmit = useCallback(() => {
    if (guess === currentItem.word) {
      const points = 100 + streak * 25;
      const nextScore = score + points;
      setScore(nextScore);
      setStreak((s) => s + 1);
      setIsWordSolved(true);
      setFeedback(`🎉 Perfect! +${points} pts`);

      if (wordIndex >= HUNT_WORDS.length - 1) {
        setIsGameCompleted(true);
        onComplete?.(nextScore);
      }
    } else {
      setStreak(0);
      setFeedback("Not quite right yet! Try again or undo.");
    }
  }, [guess, currentItem.word, score, streak, wordIndex, onComplete]);

  const handleNextWord = () => {
    if (wordIndex < HUNT_WORDS.length - 1) {
      const nextIdx = wordIndex + 1;
      setWordIndex(nextIdx);
      setScrambled(scramble(HUNT_WORDS[nextIdx].word));
      setSelectedIndices([]);
      setGuess("");
      setIsWordSolved(false);
      setFeedback(null);
    }
  };

  const handleRestart = () => {
    setWordIndex(0);
    setScrambled(scramble(HUNT_WORDS[0].word));
    setSelectedIndices([]);
    setGuess("");
    setScore(0);
    setStreak(0);
    setHintsLeft(3);
    setIsWordSolved(false);
    setIsGameCompleted(false);
    setFeedback(null);
    onRestart?.();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (isWordSolved) {
          handleNextWord();
        } else {
          handleSubmit();
        }
      } else if (e.key === "Backspace") {
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSubmit, isWordSolved]);

  return (
    <div className="wordHuntContainer" aria-label="Word Hunt Anagram Puzzle">
      <div className="wordHuntHeader">
        <div>
          <span className="wordHuntUrdu">الفاظ کا خزانہ · معمہ</span>
          <h3 className="wordHuntTitle">Sweet Word Hunt</h3>
          <p className="wordHuntSub">
            Unscramble words celebrating Meerah&apos;s laughter, warmth, and radiant spirit!
          </p>
        </div>

        <div className="wordHuntStats">
          <div className="scorePill">
            <span className="scoreLabel">WORD</span>
            <span className="scoreVal">
              {wordIndex + 1}/{HUNT_WORDS.length}
            </span>
          </div>
          <div className="scorePill">
            <span className="scoreLabel">SCORE</span>
            <span className="scoreVal">{score}</span>
          </div>
          <div className="scorePill best">
            <span className="scoreLabel">STREAK</span>
            <span className="scoreVal">🔥 {streak}</span>
          </div>
        </div>
      </div>

      {/* Clue Box */}
      <div className="wordHuntClueCard">
        <span className="clueIcon">💡</span>
        <div className="clueContent">
          <p className="clueEnglish">{currentItem.clue}</p>
          <p className="clueUrdu" dir="rtl">
            {currentItem.urduHint}
          </p>
        </div>
      </div>

      {/* Answer Slots */}
      <div className="wordHuntAnswerArea">
        <div className="wordAnswerSlots">
          {Array.from({ length: currentItem.word.length }).map((_, i) => (
            <div
              key={i}
              className={`letterSlot ${guess[i] ? "filled" : ""} ${
                isWordSolved ? "solved" : ""
              }`}
            >
              {guess[i] || ""}
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`wordFeedback ${isWordSolved ? "success" : "neutral"}`}>
          {feedback}
        </div>
      )}

      {/* Scrambled Tile Bank */}
      <div className="scrambledTilesGrid">
        {scrambled.map((letter, idx) => {
          const isUsed = selectedIndices.includes(idx);
          return (
            <button
              key={idx}
              className={`letterTile ${isUsed ? "used" : ""}`}
              onClick={() => handleTileClick(idx)}
              disabled={isUsed || isWordSolved}
              aria-label={`Letter ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="wordHuntActions">
        <button
          className="button secondary"
          onClick={handleUndo}
          disabled={selectedIndices.length === 0 || isWordSolved}
        >
          ⌫ Undo
        </button>
        <button
          className="button secondary"
          onClick={handleClear}
          disabled={selectedIndices.length === 0 || isWordSolved}
        >
          Clear
        </button>
        <button
          className="button secondary"
          onClick={handleShuffle}
          disabled={isWordSolved}
        >
          Shuffle 🔀
        </button>
        <button
          className="button secondary"
          onClick={handleHint}
          disabled={hintsLeft <= 0 || isWordSolved}
        >
          Hint ({hintsLeft}) 💡
        </button>

        {isWordSolved ? (
          wordIndex < HUNT_WORDS.length - 1 ? (
            <button className="button primary" onClick={handleNextWord}>
              Next Word →
            </button>
          ) : (
            <button className="button primary" onClick={handleRestart}>
              Celebrate All Words! 🌸
            </button>
          )
        ) : (
          <button
            className="button primary"
            onClick={handleSubmit}
            disabled={guess.length !== currentItem.word.length}
          >
            Check Guess ✓
          </button>
        )}
      </div>

      {isGameCompleted && (
        <div className="wordHuntCelebration">
          <span>🎊</span>
          <h4>Spectacular Word Master!</h4>
          <p>
            You found all {HUNT_WORDS.length} celebration words with {score} points.
            Every word reflects Meerah&apos;s joyful magic! ♡
          </p>
        </div>
      )}
    </div>
  );
}
export default WordHunt;
