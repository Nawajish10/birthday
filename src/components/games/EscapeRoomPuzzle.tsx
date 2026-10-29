"use client";

import React, { useState } from "react";
import "./games.css";

export interface Stage {
  id: number;
  title: string;
  roomName: string;
  story: string;
  clue: string;
  solution: string;
  hint: string;
}

export const ESCAPE_STAGES: Stage[] = [
  {
    id: 1,
    title: "Stage 1: The Antique Music Box",
    roomName: "The Victorian Parlor",
    story:
      "A locked mahogany music box sits on the table. A faded parchment reads: 'Count the letters in the title of the Urdu masterpiece about the morning breeze by Faiz.'",
    clue: "Hint: English romanized title of Faiz's collection is DAST E SABA. How many letters total?",
    solution: "10",
    hint: "D-A-S-T (4) + E (1) + S-A-B-A (4) = 9 or 10 letters without spaces? Try counting: DASTESABA = 10.",
  },
  {
    id: 2,
    title: "Stage 2: The Constellation Vault",
    roomName: "The Observatory",
    story:
      "A telescope points toward a sparkling cluster. The brass dial asks for the constellation name associated with a crown of starlight for the queen of hearts.",
    clue: "Four letter word: C R _ W N",
    solution: "CROWN",
    hint: "It rhymes with brown and shines upon Meerah's head.",
  },
  {
    id: 3,
    title: "Stage 3: The Sanctuary Heart Lock",
    roomName: "The Secret Garden Door",
    story:
      "The final garden gate requires the password whispered by the little prince to his rose. What was essential?",
    clue: "One four-letter word that binds every memory in this birthday universe.",
    solution: "LOVE",
    hint: "L - O - V - E",
  },
];

export interface EscapeRoomProps {
  onComplete?: () => void;
  onRestart?: () => void;
}

export function EscapeRoomPuzzle({ onComplete, onRestart }: EscapeRoomProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [isEscaped, setIsEscaped] = useState(false);

  const stage = ESCAPE_STAGES[currentStageIdx];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const normalized = inputVal.trim().toUpperCase();
    if (normalized === stage.solution) {
      if (currentStageIdx < ESCAPE_STAGES.length - 1) {
        setCurrentStageIdx((prev) => prev + 1);
        setInputVal("");
        setShowHint(false);
      } else {
        setIsEscaped(true);
        onComplete?.();
      }
    } else {
      setErrorMsg("Incorrect code. Listen closely to the clue!");
    }
  };

  const handleReset = () => {
    setCurrentStageIdx(0);
    setInputVal("");
    setErrorMsg("");
    setShowHint(false);
    setIsEscaped(false);
    onRestart?.();
  };

  return (
    <div className="escapeRoomContainer" aria-label="Escape Room Puzzle">
      <div className="escapeHeader">
        <h3 className="escapeTitle">Cooperative Escape Room &middot; پہیلی کا کمرہ</h3>
        <p className="escapeSubtitle">
          Work together to decipher clues, crack passwords, and unlock the secret garden!
        </p>
      </div>

      {!isEscaped ? (
        <div className="escapeCard">
          <div className="escapeStageBadge">
            {stage.roomName} &middot; Stage {currentStageIdx + 1} of {ESCAPE_STAGES.length}
          </div>
          <h4 className="escapeStageTitle">{stage.title}</h4>
          <p className="escapeStoryText">{stage.story}</p>

          <div className="escapeClueBox">
            <span className="clueIcon" aria-hidden="true">
              📜
            </span>
            <p className="clueText">{stage.clue}</p>
          </div>

          <form onSubmit={handleSubmit} className="escapeForm">
            <input
              type="text"
              className="escapeInput"
              placeholder="Enter passcode to unlock..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              aria-label="Passcode entry"
            />
            <button type="submit" className="escapeSubmitBtn">
              Unlock Mechanism 🗝️
            </button>
          </form>

          {errorMsg && <p className="escapeErrorMsg">{errorMsg}</p>}

          <div className="escapeHintToggle">
            <button
              type="button"
              className="hintBtn"
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? "Hide Hint ✕" : "Need a Hint? 💡"}
            </button>
            {showHint && <p className="hintText">{stage.hint}</p>}
          </div>
        </div>
      ) : (
        <div className="escapeSuccessCard">
          <div className="escapeKeyIcon" aria-hidden="true">
            🗝️✨
          </div>
          <h3 className="escapeSuccessTitle">Garden Sanctuary Unlocked!</h3>
          <p className="escapeSuccessText">
            You cracked every cipher and solved the mystery together! The gates swing open into
            a garden blooming with sweet memories and eternal warmth.
          </p>
          <button type="button" className="escapeResetBtn" onClick={handleReset}>
            Re-enter Escape Room ↺
          </button>
        </div>
      )}
    </div>
  );
}

export default EscapeRoomPuzzle;
