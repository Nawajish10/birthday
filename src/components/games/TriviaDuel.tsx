"use client";

import React, { useState, useEffect } from "react";
import "./games.css";

export interface DuelQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const DUEL_QUESTIONS: readonly DuelQuestion[] = [
  {
    id: "dq-1",
    question: "What is Meerah's absolute favorite comforting hot beverage on a rainy day?",
    options: ["Cardamom Chai ☕", "Iced Vanilla Latte 🧊", "Matcha Green Tea 🍵", "Hot Dark Cocoa 🍫"],
    correctIndex: 0,
    explanation: "Cardamom chai brewed with love and just the right touch of warmth!",
  },
  {
    id: "dq-2",
    question: "Which flower always reminds Noah of Meerah's radiant and sunny warmth?",
    options: ["Sunflower 🌻", "Red Rose 🌹", "White Lily 🌸", "Purple Lavender 🪻"],
    correctIndex: 0,
    explanation: "A bright sunflower—always turning toward the light and bringing pure joy!",
  },
  {
    id: "dq-3",
    question: "When Meerah watches a suspenseful mystery movie, what always happens?",
    options: [
      "She predicts the plot twist before anyone else 🔍",
      "She falls asleep during the opening credits 😴",
      "She leaves the room during suspense scenes 🙈",
      "She reads the entire Wikipedia synopsis out loud 📖",
    ],
    correctIndex: 0,
    explanation: "Her sharp deductive instincts spot every single clue instantly!",
  },
  {
    id: "dq-4",
    question: "What is the secret superpower behind Meerah's heartwarming laugh?",
    options: [
      "It makes everyone in the room immediately smile ✨",
      "It can be heard across entire city blocks 📢",
      "It only happens on Tuesdays 🗓️",
      "It summons hummingbirds 🐦",
    ],
    correctIndex: 0,
    explanation: "Her laugh is pure sunshine that instantly illuminates the world.",
  },
];

export interface TriviaDuelProps {
  onComplete?: (finalScore: number) => void;
  onRestart?: () => void;
  isMultiplayer?: boolean;
}

export function TriviaDuel({
  onComplete,
  onRestart,
  isMultiplayer = false,
}: TriviaDuelProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [isFinished, setIsFinished] = useState(false);

  // Timer countdown per question
  useEffect(() => {
    if (isAnswered || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsAnswered(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered, isFinished]);

  const currentQ = DUEL_QUESTIONS[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correctIndex) {
      const bonus = Math.max(50, timeLeft * 10);
      setPlayer1Score((s) => s + 100 + bonus);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx < DUEL_QUESTIONS.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(15);
    } else {
      setIsFinished(true);
      onComplete?.(player1Score);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setPlayer1Score(0);
    setPlayer2Score(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(15);
    setIsFinished(false);
    onRestart?.();
  };

  return (
    <div className="triviaDuelContainer" aria-label="Trivia Duel">
      <div className="duelHeader">
        <h3 className="duelTitle">Trivia Duel &middot; معلومات کا مقابلہ</h3>
        <p className="duelSubtitle">
          Fast-paced questions celebrating sweet shared memories!
        </p>
      </div>

      <div className="duelScoreBoard">
        <div className="duelScorePill playerOne">
          <span>Meerah / P1:</span>
          <strong>{player1Score} pts</strong>
        </div>
        <div className={`duelTimerPill ${timeLeft <= 5 ? "timerUrgent" : ""}`}>
          <span>⏱️ {timeLeft}s</span>
        </div>
        {isMultiplayer && (
          <div className="duelScorePill playerTwo">
            <span>Noah / P2:</span>
            <strong>{player2Score} pts</strong>
          </div>
        )}
      </div>

      {!isFinished ? (
        <div className="duelQuestionCard">
          <div className="duelQuestionMeta">
            Question {currentIdx + 1} of {DUEL_QUESTIONS.length}
          </div>
          <h4 className="duelQuestionText">{currentQ.question}</h4>

          <div className="duelOptionsGrid">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;
              let optionClass = "duelOptionBtn";

              if (isAnswered) {
                if (isCorrect) optionClass += " isCorrect";
                else if (isSelected) optionClass += " isWrong";
              }

              return (
                <button
                  key={idx}
                  className={optionClass}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                >
                  <span className="optionBadge">{String.fromCharCode(65 + idx)}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>

          {isAnswered && (
            <div className="duelExplanationBox">
              <p className="duelExplanationText">
                {selectedOption === currentQ.correctIndex ? "✨ Correct! " : "💡 Note: "}
                {currentQ.explanation}
              </p>
              <button
                type="button"
                className="duelNextBtn"
                onClick={handleNextQuestion}
              >
                {currentIdx < DUEL_QUESTIONS.length - 1 ? "Next Question →" : "See Final Score 🏆"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="duelResultsCard">
          <div className="duelTrophy" aria-hidden="true">
            🏆
          </div>
          <h3 className="duelResultsTitle">Duel Complete!</h3>
          <p className="duelResultsScore">
            Final Score: <strong>{player1Score} points</strong>
          </p>
          <p className="duelCelebrationMessage">
            You know every tender nuance and radiant memory by heart!
          </p>
          <button type="button" className="duelRestartBtn" onClick={handleReset}>
            Play Another Duel ↺
          </button>
        </div>
      )}
    </div>
  );
}

export default TriviaDuel;
