"use client";

import React, { useState } from "react";
import "./games.css";

export interface Dilemma {
  id: number;
  optionA: string;
  optionB: string;
  category: string;
}

export const DILEMMAS: Dilemma[] = [
  {
    id: 1,
    optionA: "Spend a rainy evening curled up with cardamom chai and a mystery novel ☕📖",
    optionB: "Drive through midnight starlight listening to our acoustic love playlist 🚗🌙",
    category: "Cozy Evening",
  },
  {
    id: 2,
    optionA: "Have an endless supply of fresh hot bakery croissants every morning 🥐",
    optionB: "Have a teleportation door that leads directly into a secret botanical flower garden 🌸",
    category: "Daydreams",
  },
  {
    id: 3,
    optionA: "Watch the sunset from a quiet Mediterranean terrace overlooking the sea 🌅",
    optionB: "Wander through an ancient library filled with forgotten leather-bound books 🗝️",
    category: "Travel Sanctuary",
  },
  {
    id: 4,
    optionA: "Be surprised with a handwritten 10-page love letter 💌",
    optionB: "Be surprised with an unannounced candlelit rooftop birthday dinner 🎂🕯️",
    category: "Heartfelt Surprises",
  },
];

export interface WouldYouRatherProps {
  onComplete?: () => void;
  onRestart?: () => void;
}

export function WouldYouRather({ onComplete, onRestart }: WouldYouRatherProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, "A" | "B">>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const current = DILEMMAS[currentIdx];
  const choice = selectedChoices[current.id];

  const handlePick = (option: "A" | "B") => {
    const updated = { ...selectedChoices, [current.id]: option };
    setSelectedChoices(updated);

    if (currentIdx < DILEMMAS.length - 1) {
      setTimeout(() => {
        setCurrentIdx((prev) => prev + 1);
      }, 350);
    } else {
      setTimeout(() => {
        setIsCompleted(true);
        onComplete?.();
      }, 350);
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedChoices({});
    setIsCompleted(false);
    onRestart?.();
  };

  return (
    <div className="wouldYouRatherContainer" aria-label="Would You Rather Party Game">
      <div className="wyrHeader">
        <h3 className="wyrTitle">Would You Rather &middot; انتخاب کیجیے</h3>
        <p className="wyrSubtitle">
          Playful romantic dilemmas crafted especially for Meerah &amp; Noah!
        </p>
      </div>

      {!isCompleted ? (
        <div className="wyrCard">
          <div className="wyrBadge">
            Dilemma {currentIdx + 1} of {DILEMMAS.length} &middot; {current.category}
          </div>
          <h4 className="wyrPrompt">Would you rather...</h4>

          <div className="wyrChoiceGrid">
            <button
              type="button"
              className={`wyrChoiceBtn ${choice === "A" ? "isSelected" : ""}`}
              onClick={() => handlePick("A")}
            >
              <span className="choiceLabel">Option A</span>
              <p className="choiceText">{current.optionA}</p>
            </button>

            <div className="wyrOrDivider" aria-hidden="true">
              <span>OR</span>
            </div>

            <button
              type="button"
              className={`wyrChoiceBtn ${choice === "B" ? "isSelected" : ""}`}
              onClick={() => handlePick("B")}
            >
              <span className="choiceLabel">Option B</span>
              <p className="choiceText">{current.optionB}</p>
            </button>
          </div>
        </div>
      ) : (
        <div className="wyrSummaryCard">
          <div className="wyrHeartIcon" aria-hidden="true">
            💖✨
          </div>
          <h3 className="wyrSummaryTitle">Dilemmas Answered!</h3>
          <p className="wyrSummaryDesc">
            100% Soulmate Compatibility! Every choice you made reflects pure warmth, cozy
            thoughtfulness, and true romantic delight.
          </p>
          <button type="button" className="wyrRestartBtn" onClick={handleReset}>
            Play Choices Again ↺
          </button>
        </div>
      )}
    </div>
  );
}

export default WouldYouRather;
