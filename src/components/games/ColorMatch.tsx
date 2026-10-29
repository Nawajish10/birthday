"use client";

import React, { useState, useEffect, useCallback } from "react";

export interface ColorMatchProps {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

interface ColorItem {
  name: string;
  hex: string;
}

const PALETTE: ColorItem[] = [
  { name: "ROSE", hex: "#b6535f" },
  { name: "GOLD", hex: "#e5a93b" },
  { name: "SAGE", hex: "#376e58" },
  { name: "LAVENDER", hex: "#8a5ca5" },
  { name: "PEACH", hex: "#e07a5f" },
  { name: "AMBER", hex: "#d97706" },
];

function generateQuestion(): {
  word: string;
  colorHex: string;
  colorName: string;
  isMatch: boolean;
} {
  const isMatch = Math.random() < 0.5;
  const wordItem = PALETTE[Math.floor(Math.random() * PALETTE.length)];

  if (isMatch) {
    return {
      word: wordItem.name,
      colorHex: wordItem.hex,
      colorName: wordItem.name,
      isMatch: true,
    };
  } else {
    let otherItem = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    while (otherItem.name === wordItem.name) {
      otherItem = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    }
    return {
      word: wordItem.name,
      colorHex: otherItem.hex,
      colorName: otherItem.name,
      isMatch: false,
    };
  }
}

export function ColorMatch({ onComplete, onRestart }: ColorMatchProps) {
  const [current, setCurrent] = useState(() => generateQuestion());
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const startGame = () => {
    setCurrent(generateQuestion());
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setIsGameOver(false);
    setFeedback(null);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setFeedback(null);
    onRestart?.();
  };

  const answer = useCallback(
    (userSaidMatch: boolean) => {
      if (!isPlaying || isGameOver) return;

      const correct = userSaidMatch === current.isMatch;
      if (correct) {
        const bonus = 10 + streak * 5;
        const newScore = score + bonus;
        setScore(newScore);
        setStreak((s) => s + 1);
        setFeedback("correct");
      } else {
        setStreak(0);
        setFeedback("wrong");
      }

      setCurrent(generateQuestion());
    },
    [isPlaying, isGameOver, current.isMatch, score, streak]
  );

  // Timer
  useEffect(() => {
    if (!isPlaying || isGameOver || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setIsGameOver(true);
          setIsPlaying(false);
          onComplete?.(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isGameOver, timeLeft, score, onComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        answer(true);
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        answer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, answer]);

  return (
    <div className="colorMatchContainer" aria-label="Color Match Puzzle">
      <div className="colorHeader">
        <div>
          <span className="colorUrdu">رنگوں کا معمہ · توجہ کی آزمائش</span>
          <h3 className="colorTitle">Pastel Color Match</h3>
          <p className="colorSub">
            Does the text meaning match the ink color? Answer as swiftly as possible!
          </p>
        </div>

        <div className="colorStats">
          <div className="scorePill">
            <span className="scoreLabel">TIME</span>
            <span className="scoreVal">⏱ {timeLeft}s</span>
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

      {/* Main Color Challenge Card */}
      <div className="colorCardWrapper">
        {!isPlaying && !isGameOver ? (
          <div className="colorStartPrompt">
            <span className="colorPromptIcon">🎨</span>
            <h4>Ready to test your focus?</h4>
            <p>
              Match color names with Meerah&apos;s warm pastel palette. Speed gives extra combo points!
            </p>
            <button className="button primary" onClick={startGame}>
              Start Color Match ▶
            </button>
          </div>
        ) : isGameOver ? (
          <div className="colorGameOverPrompt">
            <span>🌟</span>
            <h4>Time&apos;s Up!</h4>
            <p>
              Final Score: <strong>{score} points</strong> with a top streak of{" "}
              <strong>{streak}</strong>!
            </p>
            <button className="button primary" onClick={startGame}>
              Play Again ↺
            </button>
          </div>
        ) : (
          <div className={`colorDisplayBox feedback-${feedback || "none"}`}>
            <span className="colorWord" style={{ color: current.colorHex }}>
              {current.word}
            </span>
            <span className="colorHint">Does this ink match the word?</span>
          </div>
        )}
      </div>

      {/* Choice Buttons */}
      {isPlaying && (
        <div className="colorChoices">
          <button
            className="colorChoiceBtn matchBtn"
            onClick={() => answer(true)}
            aria-label="Matches (Press Left Arrow)"
          >
            <span className="btnKey">◀ Left</span>
            <span className="btnLabel">MATCH ✓</span>
          </button>
          <button
            className="colorChoiceBtn differBtn"
            onClick={() => answer(false)}
            aria-label="Differs (Press Right Arrow)"
          >
            <span className="btnKey">Right ▶</span>
            <span className="btnLabel">DIFFERENT ✗</span>
          </button>
        </div>
      )}

      {/* Footer controls */}
      {isPlaying && (
        <div className="colorFooter">
          <button className="button secondary" onClick={handleRestart}>
            Reset ↺
          </button>
        </div>
      )}
    </div>
  );
}
export default ColorMatch;
