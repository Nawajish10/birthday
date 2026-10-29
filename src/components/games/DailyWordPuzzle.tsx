"use client";

import React, { useState } from "react";
import "./games.css";
import {
  TARGET_WORD,
  MAX_ATTEMPTS,
  WORD_LENGTH,
  TileStatus,
  evaluateGuess,
} from "./daily-word-logic";

export { TARGET_WORD, MAX_ATTEMPTS, WORD_LENGTH, evaluateGuess };
export type { TileStatus };

export interface DailyWordPuzzleProps {
  onComplete?: (attempts: number) => void;
  onRestart?: () => void;
}

export function DailyWordPuzzle({ onComplete, onRestart }: DailyWordPuzzleProps) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string>("");
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleKeyInput = (letter: string) => {
    if (gameStatus !== "playing") return;
    setErrorMsg("");
    if (currentGuess.length < WORD_LENGTH) {
      setCurrentGuess((prev) => prev + letter.toUpperCase());
    }
  };

  const handleDelete = () => {
    if (gameStatus !== "playing") return;
    setErrorMsg("");
    setCurrentGuess((prev) => prev.slice(0, -1));
  };

  const handleEnter = () => {
    if (gameStatus !== "playing") return;
    if (currentGuess.length !== WORD_LENGTH) {
      setErrorMsg(`Word must be exactly ${WORD_LENGTH} letters long`);
      return;
    }

    const updatedGuesses = [...guesses, currentGuess];
    setGuesses(updatedGuesses);
    setCurrentGuess("");

    if (currentGuess === TARGET_WORD) {
      setGameStatus("won");
      onComplete?.(updatedGuesses.length);
    } else if (updatedGuesses.length >= MAX_ATTEMPTS) {
      setGameStatus("lost");
    }
  };

  const handleReset = () => {
    setGuesses([]);
    setCurrentGuess("");
    setGameStatus("playing");
    setErrorMsg("");
    onRestart?.();
  };

  const rows = Array.from({ length: MAX_ATTEMPTS }).map((_, rIdx) => {
    if (rIdx < guesses.length) {
      const word = guesses[rIdx];
      const statuses = evaluateGuess(word, TARGET_WORD);
      return word.split("").map((letter, lIdx) => ({ letter, status: statuses[lIdx] }));
    } else if (rIdx === guesses.length) {
      return Array.from({ length: WORD_LENGTH }).map((_, lIdx) => ({
        letter: currentGuess[lIdx] || "",
        status: "empty" as TileStatus,
      }));
    } else {
      return Array.from({ length: WORD_LENGTH }).map(() => ({
        letter: "",
        status: "empty" as TileStatus,
      }));
    }
  });

  return (
    <div className="dailyWordContainer" aria-label="Daily Word Puzzle">
      <div className="wordleHeader">
        <h3 className="wordleTitle">Daily Word Puzzle &middot; لفظ کا معمہ</h3>
        <p className="wordleSubtitle">
          Guess the secret 5-letter word describing Meerah&apos;s joyful spirit!
        </p>
      </div>

      <div className="wordleGrid" role="grid" aria-label="Word puzzle grid">
        {rows.map((row, rIdx) => (
          <div key={rIdx} className="wordleRow" role="row">
            {row.map((cell, cIdx) => (
              <div
                key={cIdx}
                className={`wordleTile status-${cell.status}`}
                role="gridcell"
                aria-label={`Row ${rIdx + 1} Letter ${cIdx + 1}: ${cell.letter || "empty"}`}
              >
                {cell.letter}
              </div>
            ))}
          </div>
        ))}
      </div>

      {errorMsg && <p className="wordleErrorMsg">{errorMsg}</p>}

      {gameStatus === "playing" ? (
        <div className="wordleKeyboard" aria-label="Virtual keyboard">
          {["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"].map((row, rIdx) => (
            <div key={rIdx} className="keyboardRow">
              {rIdx === 2 && (
                <button type="button" className="keySpecial" onClick={handleEnter}>
                  ENTER
                </button>
              )}
              {row.split("").map((char) => (
                <button
                  key={char}
                  type="button"
                  className="keyLetter"
                  onClick={() => handleKeyInput(char)}
                >
                  {char}
                </button>
              ))}
              {rIdx === 2 && (
                <button type="button" className="keySpecial" onClick={handleDelete}>
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="wordleOutcomeCard">
          {gameStatus === "won" ? (
            <div className="wordleWon">
              <span className="wonIcon" aria-hidden="true">
                🎉✨
              </span>
              <h4>Brilliant! You solved it!</h4>
              <p>
                The word was <strong>{TARGET_WORD}</strong>—the brightest, sweetest thing about
                you!
              </p>
            </div>
          ) : (
            <div className="wordleLost">
              <span className="lostIcon" aria-hidden="true">
                🌻
              </span>
              <h4>Nice Try!</h4>
              <p>
                The word was <strong>{TARGET_WORD}</strong>!
              </p>
            </div>
          )}
          <button type="button" className="wordleResetBtn" onClick={handleReset}>
            Play Again ↺
          </button>
        </div>
      )}
    </div>
  );
}

export default DailyWordPuzzle;
