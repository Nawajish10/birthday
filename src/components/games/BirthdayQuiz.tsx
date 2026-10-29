"use client";

import React, { useState } from "react";
import {
  BIRTHDAY_QUIZ_QUESTIONS,
  createBirthdayQuizState,
  selectQuizOption,
  advanceQuizQuestion,
  resetBirthdayQuiz,
  getQuizCelebrationMessage,
  BirthdayQuizState,
} from "./game-registry";

interface BirthdayQuizProps {
  onComplete?: (finalScore: number) => void;
  onRestart?: () => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export function BirthdayQuiz({ onComplete, onRestart }: BirthdayQuizProps) {
  const [state, setState] = useState<BirthdayQuizState>(() => createBirthdayQuizState());

  const currentQ = BIRTHDAY_QUIZ_QUESTIONS[state.currentQuestionIndex];
  const isLastQuestion = state.currentQuestionIndex >= BIRTHDAY_QUIZ_QUESTIONS.length - 1;

  const handleSelectOption = (optionIndex: number) => {
    setState((prev) => selectQuizOption(prev, optionIndex));
  };

  const handleNext = () => {
    setState((prev) => {
      const next = advanceQuizQuestion(prev);
      if (next.isQuizCompleted) {
        onComplete?.(next.score);
      }
      return next;
    });
  };

  const handleReset = () => {
    setState(resetBirthdayQuiz());
    onRestart?.();
  };

  // Completion view
  if (state.isQuizCompleted) {
    const celebration = getQuizCelebrationMessage(state.score, BIRTHDAY_QUIZ_QUESTIONS.length);

    return (
      <div className="birthdayQuizGame">
        <div className="gameCelebrationCard">
          <span className="gameCelebrationIcon">🎂</span>
          <span className="gameCelebrationBadge">{celebration.badge}</span>
          <h3 className="gameCelebrationTitle">{celebration.title}</h3>
          <p className="gameCelebrationText">{celebration.message}</p>
          <div className="gameCelebrationActions">
            <button
              className="gamePlayButton"
              onClick={handleReset}
              aria-label="Retake birthday quiz"
            >
              Retake Quiz ↺
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage =
    ((state.currentQuestionIndex + (state.isAnswerSubmitted ? 1 : 0)) /
      BIRTHDAY_QUIZ_QUESTIONS.length) *
    100;

  return (
    <div className="birthdayQuizGame">
      {/* Progress Bar & Header */}
      <div className="gameProgressRow">
        <span className="quizQuestionNumber">
          Question {state.currentQuestionIndex + 1} of {BIRTHDAY_QUIZ_QUESTIONS.length}
        </span>
        <span>
          Score: <b>{state.score}</b> / {BIRTHDAY_QUIZ_QUESTIONS.length}
        </span>
      </div>

      <div
        className="gameProgressBarContainer"
        role="progressbar"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="gameProgressBarFill" style={{ width: `${progressPercentage}%` }} />
      </div>

      {/* Question Card */}
      <div className="quizQuestionCard">
        <h3 className="quizQuestionTitle">{currentQ.question}</h3>

        {/* Options List */}
        <div className="quizOptionsList" role="radiogroup" aria-label="Quiz question options">
          {currentQ.options.map((option, idx) => {
            const isSelected = state.selectedOptionIndex === idx;
            const isCorrectAnswer = idx === currentQ.correctIndex;

            let optionClassName = "quizOptionButton";
            if (state.isAnswerSubmitted) {
              if (isSelected) {
                optionClassName += isCorrectAnswer ? " isCorrect" : " isWrong";
              } else if (isCorrectAnswer) {
                // Highlight the correct answer even if another was chosen
                optionClassName += " isCorrect";
              }
            }

            return (
              <button
                key={idx}
                className={optionClassName}
                onClick={() => handleSelectOption(idx)}
                disabled={state.isAnswerSubmitted}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Option ${OPTION_LETTERS[idx]}: ${option}`}
              >
                <span className="quizOptionLetter">{OPTION_LETTERS[idx]}</span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {/* Instant Feedback & Explanation */}
        {state.isAnswerSubmitted && (
          <div
            className={`quizExplanationCard ${
              state.selectedOptionIndex === currentQ.correctIndex ? "" : "wrongFeedback"
            }`}
          >
            <div className="quizExplanationHeader">
              {state.selectedOptionIndex === currentQ.correctIndex ? (
                <>
                  <span style={{ color: "var(--game-sage)", fontSize: "16px" }}>✓</span>
                  <span style={{ color: "var(--game-sage)" }}>Spot on! You know Meerah so well!</span>
                </>
              ) : (
                <>
                  <span style={{ color: "var(--game-rose)", fontSize: "16px" }}>♡</span>
                  <span style={{ color: "var(--game-rose)" }}>So sweet! Here&apos;s the inside scoop:</span>
                </>
              )}
            </div>
            <p className="quizExplanationText">{currentQ.explanation}</p>
            <p className="quizFunFact">✿ {currentQ.funFact}</p>

            <div className="quizNextContainer">
              <button className="gamePlayButton" onClick={handleNext} autoFocus>
                {isLastQuestion ? "See My Results 🎉" : "Next Question →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
