import test, { describe } from "node:test";
import assert from "node:assert/strict";
import type { GameDefinition, GameId } from "../src/components/games/game-registry.ts";
import {
  GAME_DEFINITIONS,
  getGameDefinition,
  getAllGames,
  registerGameComponent,
  SCRAMBLE_WORDS,
  createWordScrambleState,
  scrambleWordLetters,
  selectLetterTile,
  removeLastLetter,
  clearLetterTiles,
  useScrambleHint,
  submitScrambleGuess,
  nextScrambleWord,
  resetWordScramble,
  BIRTHDAY_QUIZ_QUESTIONS,
  createBirthdayQuizState,
  selectQuizOption,
  advanceQuizQuestion,
  resetBirthdayQuiz,
  getQuizCelebrationMessage,
  createMemoryMatchState,
  flipMemoryCard,
  resolveMismatchedCards,
  buildMemoryDeckState,
  createGamesHubState,
  openGame,
  closeToHub,
  markGameCompleted,
} from "../src/components/games/game-registry.ts";

/* ============================================================================
 * 1. GAME REGISTRY CONTRACT TESTS
 * ============================================================================ */

describe("1. Game Registry Contract", () => {
  test("Registry contains playable games including core starters", () => {
    assert.ok(GAME_DEFINITIONS.length >= 3);
    const ids = GAME_DEFINITIONS.map((g) => g.id);
    assert.ok(ids.includes("memory-match"));
    assert.ok(ids.includes("word-scramble"));
    assert.ok(ids.includes("birthday-quiz"));
  });

  test("Every game definition contains all required metadata fields", () => {
    for (const game of GAME_DEFINITIONS) {
      assert.ok(game.id, "Game must have an id");
      assert.ok(game.title, `Game ${game.id} must have a title`);
      assert.ok(game.urduTitle, `Game ${game.id} must have an urduTitle`);
      assert.ok(game.description, `Game ${game.id} must have a description`);
      assert.ok(game.icon, `Game ${game.id} must have an icon`);
      assert.ok(game.badge, `Game ${game.id} must have a badge`);
      assert.ok(game.estimatedTime, `Game ${game.id} must have an estimatedTime`);
      assert.ok(["gold", "rose", "sage"].includes(game.washiColor), "Valid washi color");
    }
  });

  test("getGameDefinition retrieves game by ID or returns undefined for unknown ID", () => {
    const memory = getGameDefinition("memory-match");
    assert.ok(memory);
    assert.equal(memory.id, "memory-match");
    assert.equal(memory.title, "Memory Match");

    const unknown = getGameDefinition("unknown-game" as GameId);
    assert.equal(unknown, undefined);
  });

  test("Component registration attaches component to game definition", () => {
    const mockComponent = () => "MockComponent";
    registerGameComponent("word-scramble", mockComponent);

    const scramble = getGameDefinition("word-scramble");
    assert.ok(scramble);
    assert.equal(scramble.component, mockComponent);

    const all = getAllGames();
    const registeredScramble = all.find((g) => g.id === "word-scramble");
    assert.equal(registeredScramble?.component, mockComponent);
  });
});

/* ============================================================================
 * 2. WORD SCRAMBLE STATE MACHINE TESTS
 * ============================================================================ */

describe("2. Word Scramble State Machine", () => {
  test("Scramble word bank contains themed celebration words", () => {
    assert.ok(SCRAMBLE_WORDS.length >= 5, "Should have at least 5 words");
    const words = SCRAMBLE_WORDS.map((w) => w.word);
    assert.ok(words.includes("SUNFLOWER"));
    assert.ok(words.includes("SUNSHINE"));
    assert.ok(words.includes("CUPCAKE"));
    assert.ok(words.includes("MEMORIES"));
    assert.ok(words.includes("CELEBRATION"));
  });

  test("scrambleWordLetters produces scrambled letters differing from solved word", () => {
    for (const item of SCRAMBLE_WORDS) {
      const scrambled = scrambleWordLetters(item.word, 42);
      assert.equal(scrambled.length, item.word.length);
      assert.notEqual(
        scrambled.join(""),
        item.word,
        `Scrambled word for ${item.word} should not match original`
      );
    }
  });

  test("createWordScrambleState initializes with first word and clean state", () => {
    const state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    assert.equal(state.wordIndex, 0);
    assert.equal(state.currentWord, "SUNFLOWER");
    assert.equal(state.score, 0);
    assert.equal(state.streak, 0);
    assert.equal(state.hintsRemaining, 3);
    assert.equal(state.revealedCount, 0);
    assert.equal(state.status, "playing");
    assert.equal(state.selectedIndices.length, 0);
    assert.equal(state.inputGuess, "");
  });

  test("selectLetterTile appends letter and ignores duplicate clicks", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    state = selectLetterTile(state, 0);
    assert.equal(state.selectedIndices.length, 1);
    assert.equal(state.inputGuess, state.scrambledLetters[0]);

    // Clicking the same index again is a no-op
    state = selectLetterTile(state, 0);
    assert.equal(state.selectedIndices.length, 1);

    // Clicking second tile
    state = selectLetterTile(state, 1);
    assert.equal(state.selectedIndices.length, 2);
    assert.equal(state.inputGuess, state.scrambledLetters[0] + state.scrambledLetters[1]);
  });

  test("removeLastLetter and clearLetterTiles undo selections correctly", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    state = selectLetterTile(state, 0);
    state = selectLetterTile(state, 1);
    state = selectLetterTile(state, 2);
    assert.equal(state.selectedIndices.length, 3);

    state = removeLastLetter(state);
    assert.equal(state.selectedIndices.length, 2);

    state = clearLetterTiles(state);
    assert.equal(state.selectedIndices.length, 0);
    assert.equal(state.inputGuess, "");
  });

  test("useScrambleHint reveals characters up to hint limit", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    assert.equal(state.hintsRemaining, 3);

    state = useScrambleHint(state);
    assert.equal(state.hintsRemaining, 2);
    assert.equal(state.revealedCount, 1);
    assert.ok(state.feedbackMessage?.includes("S"));

    state = useScrambleHint(state);
    state = useScrambleHint(state);
    assert.equal(state.hintsRemaining, 0);

    // No hints remaining: does not decrement below 0
    state = useScrambleHint(state);
    assert.equal(state.hintsRemaining, 0);
    assert.ok(state.feedbackMessage?.includes("No hints remaining"));
  });

  test("submitScrambleGuess with incorrect word resets streak and displays feedback", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    state.streak = 2;
    state.inputGuess = "WRONGGUESS";

    state = submitScrambleGuess(state, SCRAMBLE_WORDS);
    assert.equal(state.status, "playing");
    assert.equal(state.streak, 0);
    assert.ok(state.feedbackMessage?.includes("Not quite"));
  });

  test("submitScrambleGuess with correct word updates score, streak, and status", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    state.inputGuess = "SUNFLOWER";

    state = submitScrambleGuess(state, SCRAMBLE_WORDS);
    assert.equal(state.status, "correct");
    assert.equal(state.score, 100);
    assert.equal(state.streak, 1);
    assert.ok(state.feedbackMessage?.includes("Correct"));
  });

  test("nextScrambleWord advances to the next word", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 0);
    state.inputGuess = "SUNFLOWER";
    state = submitScrambleGuess(state, SCRAMBLE_WORDS);

    state = nextScrambleWord(state, SCRAMBLE_WORDS);
    assert.equal(state.wordIndex, 1);
    assert.equal(state.currentWord, "SUNSHINE");
    assert.equal(state.status, "playing");
    assert.equal(state.inputGuess, "");
  });

  test("Submitting final word triggers completed status", () => {
    const lastIndex = SCRAMBLE_WORDS.length - 1;
    let state = createWordScrambleState(SCRAMBLE_WORDS, lastIndex);
    state.inputGuess = SCRAMBLE_WORDS[lastIndex].word;

    state = submitScrambleGuess(state, SCRAMBLE_WORDS);
    assert.equal(state.status, "completed");
    assert.ok(state.feedbackMessage?.includes("Spectacular"));
  });

  test("resetWordScramble resets to word 0", () => {
    let state = createWordScrambleState(SCRAMBLE_WORDS, 2);
    state.score = 300;
    state = resetWordScramble(SCRAMBLE_WORDS);
    assert.equal(state.wordIndex, 0);
    assert.equal(state.score, 0);
    assert.equal(state.status, "playing");
  });
});

/* ============================================================================
 * 3. BIRTHDAY QUIZ STATE MACHINE TESTS
 * ============================================================================ */

describe("3. Birthday Quiz State Machine", () => {
  test("Quiz questions bank contains exactly 5 detailed questions", () => {
    assert.equal(BIRTHDAY_QUIZ_QUESTIONS.length, 5);
    for (const q of BIRTHDAY_QUIZ_QUESTIONS) {
      assert.ok(q.id > 0);
      assert.ok(q.question.length > 10);
      assert.equal(q.options.length, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
      assert.ok(q.explanation.length > 10);
      assert.ok(q.funFact.length > 5);
    }
  });

  test("createBirthdayQuizState initializes clean quiz state", () => {
    const state = createBirthdayQuizState();
    assert.equal(state.currentQuestionIndex, 0);
    assert.equal(state.selectedOptionIndex, null);
    assert.equal(state.score, 0);
    assert.equal(state.isAnswerSubmitted, false);
    assert.equal(state.isQuizCompleted, false);
    assert.equal(state.userAnswers.length, 0);
  });

  test("selectQuizOption with correct answer records score and submitted state", () => {
    let state = createBirthdayQuizState();
    const correctIdx = BIRTHDAY_QUIZ_QUESTIONS[0].correctIndex;

    state = selectQuizOption(state, correctIdx, BIRTHDAY_QUIZ_QUESTIONS);
    assert.equal(state.selectedOptionIndex, correctIdx);
    assert.equal(state.score, 1);
    assert.equal(state.isAnswerSubmitted, true);
    assert.equal(state.userAnswers.length, 1);
    assert.equal(state.userAnswers[0].isCorrect, true);
  });

  test("selectQuizOption with wrong answer records 0 added score and isAnswerSubmitted", () => {
    let state = createBirthdayQuizState();
    const wrongIdx = (BIRTHDAY_QUIZ_QUESTIONS[0].correctIndex + 1) % 4;

    state = selectQuizOption(state, wrongIdx, BIRTHDAY_QUIZ_QUESTIONS);
    assert.equal(state.selectedOptionIndex, wrongIdx);
    assert.equal(state.score, 0);
    assert.equal(state.isAnswerSubmitted, true);
    assert.equal(state.userAnswers[0].isCorrect, false);
  });

  test("selectQuizOption is idempotent once answer is submitted", () => {
    let state = createBirthdayQuizState();
    const correctIdx = BIRTHDAY_QUIZ_QUESTIONS[0].correctIndex;
    state = selectQuizOption(state, correctIdx, BIRTHDAY_QUIZ_QUESTIONS);

    const initialScore = state.score;
    // Trying to select again does nothing
    state = selectQuizOption(state, (correctIdx + 1) % 4, BIRTHDAY_QUIZ_QUESTIONS);
    assert.equal(state.score, initialScore);
    assert.equal(state.selectedOptionIndex, correctIdx);
  });

  test("advanceQuizQuestion moves to next question and resets submission state", () => {
    let state = createBirthdayQuizState();
    state = selectQuizOption(state, 0, BIRTHDAY_QUIZ_QUESTIONS);

    state = advanceQuizQuestion(state, BIRTHDAY_QUIZ_QUESTIONS);
    assert.equal(state.currentQuestionIndex, 1);
    assert.equal(state.selectedOptionIndex, null);
    assert.equal(state.isAnswerSubmitted, false);
  });

  test("advancing past final question completes quiz", () => {
    let state = createBirthdayQuizState();
    for (let i = 0; i < BIRTHDAY_QUIZ_QUESTIONS.length; i++) {
      state = selectQuizOption(state, BIRTHDAY_QUIZ_QUESTIONS[i].correctIndex, BIRTHDAY_QUIZ_QUESTIONS);
      state = advanceQuizQuestion(state, BIRTHDAY_QUIZ_QUESTIONS);
    }

    assert.equal(state.isQuizCompleted, true);
    assert.equal(state.score, 5);
  });

  test("getQuizCelebrationMessage returns appropriate celebratory tiers", () => {
    const perfect = getQuizCelebrationMessage(5, 5);
    assert.ok(perfect.title.includes("5 out of 5"));
    assert.ok(perfect.badge.includes("Soulmate"));

    const good = getQuizCelebrationMessage(3, 5);
    assert.ok(good.title.includes("3 out of 5"));
    assert.ok(good.badge.includes("Cherished"));

    const low = getQuizCelebrationMessage(1, 5);
    assert.ok(low.badge.includes("Explorer"));
  });

  test("resetBirthdayQuiz resets all state back to initial", () => {
    let state = createBirthdayQuizState();
    state = selectQuizOption(state, 0, BIRTHDAY_QUIZ_QUESTIONS);
    state = advanceQuizQuestion(state, BIRTHDAY_QUIZ_QUESTIONS);

    state = resetBirthdayQuiz();
    assert.equal(state.currentQuestionIndex, 0);
    assert.equal(state.score, 0);
    assert.equal(state.isQuizCompleted, false);
  });
});

/* ============================================================================
 * 4. MEMORY MATCH STATE MACHINE TESTS
 * ============================================================================ */

describe("4. Memory Match State Machine Helpers", () => {
  test("buildMemoryDeckState builds 2 * count paired tiles", () => {
    const deck = buildMemoryDeckState(6);
    assert.equal(deck.length, 12);
    const symbols = deck.map((d) => d.symbol);

    // Each symbol should appear exactly twice
    const counts = new Map<string, number>();
    for (const s of symbols) {
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    for (const count of counts.values()) {
      assert.equal(count, 2);
    }
  });

  test("createMemoryMatchState initializes cleanly", () => {
    const state = createMemoryMatchState(6);
    assert.equal(state.tiles.length, 12);
    assert.equal(state.moves, 0);
    assert.equal(state.matchedPairs, 0);
    assert.equal(state.totalPairs, 6);
    assert.equal(state.isWon, false);
    assert.equal(state.isLocked, false);
  });

  test("Flipping first card reveals card without incrementing moves", () => {
    let state = createMemoryMatchState(6);
    state = flipMemoryCard(state, 0);
    assert.equal(state.flippedIndices.length, 1);
    assert.equal(state.moves, 0);
    assert.equal(state.tiles[0].flipped, true);
  });

  test("Flipping matching second card marks cards matched and increments moves", () => {
    let state = createMemoryMatchState(6);
    // Find pair for tile 0
    const symbol = state.tiles[0].symbol;
    const pairTile = state.tiles.find((t) => t.id !== 0 && t.symbol === symbol)!;

    state = flipMemoryCard(state, 0);
    state = flipMemoryCard(state, pairTile.id);

    assert.equal(state.moves, 1);
    assert.equal(state.matchedPairs, 1);
    assert.equal(state.flippedIndices.length, 0);
    assert.equal(state.tiles[0].matched, true);
    assert.equal(state.tiles[pairTile.id].matched, true);
    assert.equal(state.isLocked, false);
  });

  test("Flipping mismatched second card locks board until resolved", () => {
    let state = createMemoryMatchState(6);
    // Find mismatched tile
    const symbol = state.tiles[0].symbol;
    const nonPairTile = state.tiles.find((t) => t.id !== 0 && t.symbol !== symbol)!;

    state = flipMemoryCard(state, 0);
    state = flipMemoryCard(state, nonPairTile.id);

    assert.equal(state.moves, 1);
    assert.equal(state.isLocked, true);
    assert.equal(state.flippedIndices.length, 2);

    // Resolving mismatch unlocks and un-flips
    state = resolveMismatchedCards(state);
    assert.equal(state.isLocked, false);
    assert.equal(state.flippedIndices.length, 0);
    assert.equal(state.tiles[0].flipped, false);
    assert.equal(state.tiles[nonPairTile.id].flipped, false);
  });
});

/* ============================================================================
 * 5. GAMES HUB NAVIGATION STATE MACHINE TESTS
 * ============================================================================ */

describe("5. Games Hub Navigation State Machine", () => {
  test("createGamesHubState defaults to Hub view with no active game", () => {
    const state = createGamesHubState();
    assert.equal(state.activeGameId, null);
    assert.equal(state.completedGames["memory-match"], false);
    assert.equal(state.completedGames["word-scramble"], false);
    assert.equal(state.completedGames["birthday-quiz"], false);
  });

  test("openGame sets active game and closeToHub returns to hub", () => {
    let state = createGamesHubState();
    state = openGame(state, "birthday-quiz");
    assert.equal(state.activeGameId, "birthday-quiz");

    state = closeToHub(state);
    assert.equal(state.activeGameId, null);
  });

  test("markGameCompleted updates completion status and stores score", () => {
    let state = createGamesHubState();
    state = markGameCompleted(state, "word-scramble", 450);
    assert.equal(state.completedGames["word-scramble"], true);
    assert.equal(state.gameScores["word-scramble"], 450);
  });
});
