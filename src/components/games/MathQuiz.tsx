"use client";

import React, { useState } from "react";

export interface MathQuizProps {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

interface MathQuestion {
  question: string;
  urduHint: string;
  options: (number | string)[];
  correctAnswer: number | string;
  celebrationNote: string;
}

const MATH_QUESTIONS: MathQuestion[] = [
  {
    question: "Meerah has 12 golden sunflowers and Noah gifts 12 rose petals. How many flowers in total?",
    urduHint: "۱۲ سورج مکھی اور ۱۲ گلاب مل کر کتنے پھول بنے؟",
    options: [20, 24, 26, 28],
    correctAnswer: 24,
    celebrationNote: "24! Exactly Meerah's milestone golden celebration number! 🌻",
  },
  {
    question: "Speed arithmetic: 100 - 76 = ?",
    urduHint: "۱۰۰ میں سے ۷۶ گھٹائیں تو کیا بچے گا؟",
    options: [14, 24, 34, 22],
    correctAnswer: 24,
    celebrationNote: "24 again! Every equation naturally leads to Meerah! ✨",
  },
  {
    question: "Rapid multiplication: 8 × 7 = ?",
    urduHint: "آٹھ ضرب سات کا حاصل کیا ہوگا؟",
    options: [54, 56, 58, 64],
    correctAnswer: 56,
    celebrationNote: "Spot on! 56 smiles lighting up her birthday! 💖",
  },
  {
    question: "If a birthday cake has 6 slices and we bake 4 cakes, how many sweet slices are there?",
    urduHint: "چار کیک اور ہر ایک کے چھ ٹکڑے، کل کتنے ہوئے؟",
    options: [20, 22, 24, 26],
    correctAnswer: 24,
    celebrationNote: "24 sweet slices of birthday joy! 🎂",
  },
  {
    question: "Speed calculation: 45 + 38 = ?",
    urduHint: "۴۵ جمع ۳۸ کا مجموعہ کیا ہے؟",
    options: [81, 83, 85, 73],
    correctAnswer: 83,
    celebrationNote: "Brilliant math instinct! 83 points of pure genius. ⚡",
  },
  {
    question: "365 days in a year × unlimited affection = ?",
    urduHint: "لامحدود محبت کا جواب کیا ہوگا؟",
    options: [365, "1000", "∞ (Infinite)", "Zero"],
    correctAnswer: "∞ (Infinite)",
    celebrationNote: "Infinite love and blessings always! ♡",
  },
  {
    question: "Speed division: 144 ÷ 12 = ?",
    urduHint: "۱۴۴ کو ۱۲ پر تقسیم کریں تو کیا آئے گا؟",
    options: [10, 11, 12, 14],
    correctAnswer: 12,
    celebrationNote: "Exactly 12! Perfect precision. 🌸",
  },
  {
    question: "Final bonus: 24 × 10 + 4 = ?",
    urduHint: "آخری حساب: چوبیس ضرب دس جمع چار",
    options: [240, 244, 254, 264],
    correctAnswer: 244,
    celebrationNote: "244 points of brilliant calculation celebration! 🎈",
  },
];

export function MathQuiz({ onComplete, onRestart }: MathQuizProps) {
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const currentQ = MATH_QUESTIONS[questionIdx];

  const handleSelectOption = (opt: number | string) => {
    if (isAnswered) return;

    setSelectedOption(opt);
    setIsAnswered(true);

    const isCorrect = opt === currentQ.correctAnswer;
    const gained = isCorrect ? 100 + streak * 20 : 0;
    const nextScore = score + gained;

    if (isCorrect) {
      setScore(nextScore);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (questionIdx < MATH_QUESTIONS.length - 1) {
      setQuestionIdx((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsCompleted(true);
      onComplete?.(score);
    }
  };

  const handleReset = () => {
    setQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setStreak(0);
    setIsCompleted(false);
    onRestart?.();
  };

  return (
    <div className="mathQuizContainer" aria-label="Math Quiz Challenge">
      <div className="mathHeader">
        <div>
          <span className="mathUrdu">حساب کا چیلنج · ذہانت کی آزمائش</span>
          <h3 className="mathTitle">Math Quiz Challenge</h3>
          <p className="mathSub">
            Solve rapid mental arithmetic and unlock Meerah&apos;s lucky numbers!
          </p>
        </div>

        <div className="mathStats">
          <div className="scorePill">
            <span className="scoreLabel">QUESTION</span>
            <span className="scoreVal">
              {questionIdx + 1}/{MATH_QUESTIONS.length}
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

      {!isCompleted ? (
        <div className="mathCard">
          {/* Question Text */}
          <div className="mathQuestionBox">
            <span className="mathIcon">🧮</span>
            <p className="mathQuestionText">{currentQ.question}</p>
            <p className="mathUrduHint" dir="rtl">
              {currentQ.urduHint}
            </p>
          </div>

          {/* Options Grid */}
          <div className="mathOptionsGrid">
            {currentQ.options.map((opt, i) => {
              let optClass = "mathOptBtn";
              if (isAnswered) {
                if (opt === currentQ.correctAnswer) {
                  optClass += " isCorrect";
                } else if (opt === selectedOption) {
                  optClass += " isWrong";
                }
              }

              return (
                <button
                  key={i}
                  className={optClass}
                  onClick={() => handleSelectOption(opt)}
                  disabled={isAnswered}
                >
                  <span className="optIndex">{["A", "B", "C", "D"][i]}</span>
                  <span className="optVal">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback & Next Button */}
          {isAnswered && (
            <div className="mathFeedbackSection">
              <p className="mathNote">
                {selectedOption === currentQ.correctAnswer ? "✓ " : "✗ "}
                {currentQ.celebrationNote}
              </p>
              <button className="button primary" onClick={handleNext}>
                {questionIdx < MATH_QUESTIONS.length - 1
                  ? "Next Question →"
                  : "View Final Results 🏆"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mathCelebrationCard">
          <span>🎓</span>
          <h4>Arithmetic Mastermind!</h4>
          <p>
            You completed all questions with <strong>{score} points</strong>! Meerah
            would be so proud of your speedy calculations. ♡
          </p>
          <button className="button primary" onClick={handleReset}>
            Play Again ↺
          </button>
        </div>
      )}
    </div>
  );
}
export default MathQuiz;
