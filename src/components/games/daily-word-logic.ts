/**
 * Daily Word Puzzle Pure Logic Engine
 */

export const TARGET_WORD = "SMILE"; // Celebrating Meerah's smile
export const MAX_ATTEMPTS = 6;
export const WORD_LENGTH = 5;

export type TileStatus = "correct" | "present" | "absent" | "empty";

export function evaluateGuess(guess: string, target: string): TileStatus[] {
  const result: TileStatus[] = Array(WORD_LENGTH).fill("absent");
  const targetChars = target.split("");
  const guessChars = guess.split("");

  // Mark correct
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = "correct";
      targetChars[i] = "*"; // consumed
      guessChars[i] = "#";
    }
  }

  // Mark present
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] !== "#") {
      const foundIdx = targetChars.indexOf(guessChars[i]);
      if (foundIdx !== -1) {
        result[i] = "present";
        targetChars[foundIdx] = "*"; // consumed
      }
    }
  }

  return result;
}
