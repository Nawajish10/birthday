"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  SCRAMBLE_WORDS,
  createWordScrambleState,
  selectLetterTile,
  removeLastLetter,
  clearLetterTiles,
  applyScrambleHint,
  submitScrambleGuess,
  nextScrambleWord,
  resetWordScramble,
  WordScrambleState,
} from "./game-registry";

interface WordScrambleProps {
  onComplete?: (finalScore: number) => void;
  onRestart?: () => void;
}

export function WordScramble({ onComplete, onRestart }: WordScrambleProps) {
  const [state, setState] = useState<WordScrambleState>(() => createWordScrambleState());

  const handleTileClick = (index: number) => {
    setState((prev) => selectLetterTile(prev, index));
  };

  const handleUndo = () => {
    setState((prev) => removeLastLetter(prev));
  };

  const handleClear = () => {
    setState((prev) => clearLetterTiles(prev));
  };

  const handleHint = () => {
    setState((prev) => applyScrambleHint(prev));
  };

  const handleSubmit = useCallback(() => {
    setState((prev) => {
      const next = submitScrambleGuess(prev);
      if (next.status === "completed") {
        onComplete?.(next.score);
      }
      return next;
    });
  }, [onComplete]);

  const handleNextWord = () => {
    setState((prev) => nextScrambleWord(prev));
  };

  const handleReset = () => {
    setState(resetWordScramble());
    onRestart?.();
  };

  // Keyboard navigation support: Enter to submit, Backspace to undo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if modifier keys are pressed
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Enter") {
        e.preventDefault();
        if (state.status === "correct") {
          handleNextWord();
        } else if (state.status === "playing") {
          handleSubmit();
        }
      } else if (e.key === "Backspace") {
        if (state.status === "playing") {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state.status, handleSubmit]);

  const progressPercentage = ((state.wordIndex + 1) / SCRAMBLE_WORDS.length) * 100;

  // Completed celebration view
  if (state.status === "completed") {
    return (
      <div className="wordScrambleGame">
        <div className="gameCelebrationCard">
          <span className="gameCelebrationIcon">🎉</span>
          <span className="gameCelebrationBadge">🌸 Master Word-Weaver</span>
          <h3 className="gameCelebrationTitle">All Words Unscrambled!</h3>
          <p className="gameCelebrationText">
            MashaAllah! You solved every birthday puzzle with {state.score} points and a {state.streak}-streak!
            Just like how you naturally bring harmony, warmth, and joy to everyone around you. Happy Birthday, Meerah! ♡
          </p>
          <div className="gameCelebrationActions">
            <button
              className="gamePlayButton"
              onClick={handleReset}
              aria-label="Play Word Scramble again"
            >
              Play Again ↺
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wordScrambleGame">
      {/* Top Progress & Stats */}
      <div className="gameProgressRow">
        <span>Word {state.wordIndex + 1} of {SCRAMBLE_WORDS.length}</span>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span>Score: <b>{state.score}</b></span>
          {state.streak > 1 && (
            <span className="chip" style={{ background: "var(--game-gold-light)", color: "#9b6b10" }}>
              🔥 {state.streak} Streak
            </span>
          )}
        </div>
      </div>

      <div className="gameProgressBarContainer" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
        <div className="gameProgressBarFill" style={{ width: `${progressPercentage}%` }} />
      </div>

      {/* Clue Card */}
      <div className="scrambleClueCard">
        <div className="scrambleCategoryTag">✿ Category: {state.category}</div>
        <p className="scrambleClueText">{state.clue}</p>
      </div>

      {/* Answer Slots Display */}
      <div className="guessSlotsContainer" aria-label="Current Word Guess">
        {Array.from({ length: state.currentWord.length }).map((_, idx) => {
          const char = state.inputGuess[idx] || "";
          return (
            <div
              key={idx}
              className={`guessSlot ${char ? "filled" : ""}`}
              aria-label={`Slot ${idx + 1}: ${char || "empty"}`}
            >
              {char}
            </div>
          );
        })}
      </div>

      {/* Success banner between words */}
      {state.status === "correct" ? (
        <div className="wordSuccessTransition">
          <h4>✨ Wonderful! You got it!</h4>
          <p>{state.feedbackMessage}</p>
          <button className="gamePlayButton" onClick={handleNextWord} autoFocus>
            Next Word →
          </button>
        </div>
      ) : (
        <>
          {/* Scrambled Letter Tiles */}
          <div className="scrambleTilesBank" aria-label="Available letter tiles">
            {state.scrambledLetters.map((letter, idx) => {
              const isUsed = state.selectedIndices.includes(idx);
              return (
                <button
                  key={idx}
                  className="letterTileButton"
                  onClick={() => handleTileClick(idx)}
                  disabled={isUsed}
                  aria-label={`Letter tile ${letter}, ${isUsed ? "used" : "available"}`}
                >
                  {letter}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="gameControlsRow">
            <button
              className="scrambleHintButton"
              onClick={handleHint}
              disabled={state.hintsRemaining <= 0}
              aria-label={`Use hint, ${state.hintsRemaining} remaining`}
            >
              💡 Hint ({state.hintsRemaining})
            </button>
            <button
              className="scrambleUndoButton"
              onClick={handleUndo}
              disabled={state.selectedIndices.length === 0}
              aria-label="Undo last letter"
            >
              ⌫ Undo
            </button>
            <button
              className="scrambleUndoButton"
              onClick={handleClear}
              disabled={state.selectedIndices.length === 0}
              aria-label="Clear all letters"
            >
              ✕ Clear
            </button>
            <button
              className="scrambleSubmitButton"
              onClick={handleSubmit}
              disabled={state.inputGuess.length === 0}
              aria-label="Check word answer"
            >
              Check Answer ✨
            </button>
          </div>

          {/* Feedback message */}
          {state.feedbackMessage && (
            <div
              className={`scrambleFeedback ${
                state.feedbackMessage.startsWith("Hint:")
                  ? "info"
                  : state.feedbackMessage.includes("Correct")
                  ? "success"
                  : "error"
              }`}
              role="status"
            >
              {state.feedbackMessage}
            </div>
          )}
        </>
      )}
    </div>
  );
}
