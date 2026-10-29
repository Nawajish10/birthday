"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface TypingRushProps {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

const RUSH_QUOTES = [
  "Meerah brings radiant sunshine and warmth wherever she walks.",
  "May your birthday sparkle with endless laughter, sweet cake, and beautiful memories.",
  "Your smile is the gentlest reminder of how joyful life can be.",
  "Wishing you good health, inner peace, and dreams blooming like fresh roses.",
  "Happy Birthday to the most cherished, elegant, and kind-hearted soul.",
  "Every shared moment is a treasured chapter in our little love story.",
];

export function TypingRush({ onComplete, onRestart }: TypingRushProps) {
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [userInput, setUserInput] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [totalCharsTyped, setTotalCharsTyped] = useState<number>(0);
  const [correctCharsTyped, setCorrectCharsTyped] = useState<number>(0);

  const currentQuote = RUSH_QUOTES[quoteIndex % RUSH_QUOTES.length];
  const inputRef = useRef<HTMLInputElement>(null);

  const startTest = () => {
    setIsActive(true);
    setIsFinished(false);
    setTimeLeft(30);
    setUserInput("");
    setTotalCharsTyped(0);
    setCorrectCharsTyped(0);
    setWpm(0);
    setAccuracy(100);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleRestart = () => {
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(30);
    setUserInput("");
    setWpm(0);
    setAccuracy(100);
    setTotalCharsTyped(0);
    setCorrectCharsTyped(0);
    onRestart?.();
  };

  const finishTest = useCallback(
    (finalCorrect: number, finalTotal: number, timeSpent: number) => {
      setIsActive(false);
      setIsFinished(true);
      const minutes = (30 - timeSpent) / 60 || 0.5;
      const finalWpm = Math.round(finalCorrect / 5 / minutes);
      const finalAcc =
        finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 100;
      setWpm(finalWpm);
      setAccuracy(finalAcc);
      const score = finalWpm * 10 + finalAcc;
      onComplete?.(score);
    },
    [onComplete]
  );

  // Timer countdown
  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          finishTest(correctCharsTyped, totalCharsTyped, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, timeLeft, correctCharsTyped, totalCharsTyped, finishTest]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isActive) {
      setIsActive(true);
    }
    const val = e.target.value;
    setUserInput(val);

    // Compute live stats
    let correct = 0;
    for (let i = 0; i < val.length; i++) {
      if (val[i] === currentQuote[i]) {
        correct++;
      }
    }
    setTotalCharsTyped((prev) => prev + 1);
    setCorrectCharsTyped(correct);

    const timeSpent = (30 - timeLeft) / 60 || 0.05;
    const liveWpm = Math.max(0, Math.round(correct / 5 / timeSpent));
    setWpm(liveWpm);
    const liveAcc = val.length > 0 ? Math.round((correct / val.length) * 100) : 100;
    setAccuracy(liveAcc);

    // If completed current sentence, move to next!
    if (val === currentQuote) {
      setQuoteIndex((prev) => prev + 1);
      setUserInput("");
    }
  };

  return (
    <div className="typingRushContainer" aria-label="Typing Rush Game">
      <div className="typingHeader">
        <div>
          <span className="typingUrdu">رفتار کی آزمائش · ٹائپنگ رش</span>
          <h3 className="typingTitle">Typing Rush</h3>
          <p className="typingSub">
            Type sweet birthday messages as swiftly and accurately as you can in 30 seconds!
          </p>
        </div>

        <div className="typingStats">
          <div className="scorePill">
            <span className="scoreLabel">TIME</span>
            <span className="scoreVal">⏱ {timeLeft}s</span>
          </div>
          <div className="scorePill">
            <span className="scoreLabel">WPM</span>
            <span className="scoreVal">⚡ {wpm}</span>
          </div>
          <div className="scorePill best">
            <span className="scoreLabel">ACCURACY</span>
            <span className="scoreVal">{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* Target Quote Display */}
      <div className="quoteDisplayCard">
        <p className="quoteChars">
          {currentQuote.split("").map((char, idx) => {
            let status = "untyped";
            if (idx < userInput.length) {
              status = userInput[idx] === char ? "correct" : "incorrect";
            } else if (idx === userInput.length) {
              status = "current";
            }
            return (
              <span key={idx} className={`quoteChar ${status}`}>
                {char}
              </span>
            );
          })}
        </p>
      </div>

      {/* Typing Input Box */}
      <div className="typingInputArea">
        <input
          ref={inputRef}
          type="text"
          className="typingInput"
          placeholder={
            isActive
              ? "Keep typing swiftly..."
              : "Click 'Start Typing' or start typing here..."
          }
          value={userInput}
          onChange={handleInputChange}
          disabled={isFinished}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
      </div>

      {/* Control Buttons */}
      <div className="typingActions">
        {!isActive && !isFinished ? (
          <button className="button primary" onClick={startTest}>
            Start Typing ▶
          </button>
        ) : isFinished ? (
          <button className="button primary" onClick={startTest}>
            Play Again ↺
          </button>
        ) : (
          <button className="button secondary" onClick={handleRestart}>
            Reset ↺
          </button>
        )}
      </div>

      {/* Completion Card */}
      {isFinished && (
        <div className="typingResultCard">
          <span>🏆</span>
          <h4>Typing Rush Completed!</h4>
          <p>
            You scored <strong>{wpm} Words Per Minute</strong> with{" "}
            <strong>{accuracy}% Accuracy</strong>! Meerah loves your swift hands. ♡
          </p>
        </div>
      )}
    </div>
  );
}
export default TypingRush;
