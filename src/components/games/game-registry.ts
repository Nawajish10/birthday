/**
 * Game Registry & Core Game Engines for Meerah's Birthday Experience
 *
 * Provides:
 * - Extensible typed game registry (GameDefinition)
 * - Word Scramble anagram puzzle state machine & word bank
 * - Birthday Quiz interactive trivia state machine & question bank
 * - Memory Match pure state logic helpers
 * - Games Hub navigation state machine
 */

import type { ComponentType } from "react";

export type GameCategory = "competitive" | "cooperative" | "social" | "solo";

export type GameId =
  | "memory-match"
  | "word-scramble"
  | "birthday-quiz"
  | "connect-four"
  | "trivia-duel"
  | "escape-room"
  | "would-you-rather"
  | "daily-word";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GameComponentType = ComponentType<any>;

export interface GameDefinition {
  id: GameId;
  title: string;
  urduTitle: string;
  description: string;
  icon: string;
  badge: string;
  category: GameCategory;
  isMultiplayerSupported?: boolean;
  estimatedTime: string;
  washiColor: "gold" | "rose" | "sage";
  component?: GameComponentType;
}

export const GAME_DEFINITIONS: readonly GameDefinition[] = [
  {
    id: "memory-match",
    title: "Memory Match",
    urduTitle: "یادوں کا کھیل",
    description: "Match pairs of sweet birthday symbols to reveal hidden memories and celebrations.",
    icon: "🌸",
    badge: "Relaxing · Pairs",
    category: "solo",
    isMultiplayerSupported: false,
    estimatedTime: "2-3 mins",
    washiColor: "gold",
  },
  {
    id: "word-scramble",
    title: "Sweet Word Scramble",
    urduTitle: "الفاظ کا کھیل",
    description: "Unscramble heartfelt words celebrating Meerah's warmth, laughter, and birthday joy.",
    icon: "✨",
    badge: "Anagrams · Clues",
    category: "competitive",
    isMultiplayerSupported: false,
    estimatedTime: "3-5 mins",
    washiColor: "rose",
  },
  {
    id: "birthday-quiz",
    title: "How Well Do You Know Meerah?",
    urduTitle: "سالگرہ کوئیز",
    description: "A playful 5-question celebration quiz on Meerah's favorites, sweetest moments, and radiant soul.",
    icon: "🎂",
    badge: "5 Questions · Fun",
    category: "solo",
    isMultiplayerSupported: false,
    estimatedTime: "2 mins",
    washiColor: "sage",
  },
  {
    id: "connect-four",
    title: "Connect Four Duel",
    urduTitle: "چار کا جوڑ",
    description: "Competitive 7x6 token dropping strategy game. First to connect four tokens in a row wins!",
    icon: "🔴",
    badge: "Competitive · Strategy",
    category: "competitive",
    isMultiplayerSupported: true,
    estimatedTime: "3-5 mins",
    washiColor: "gold",
  },
  {
    id: "trivia-duel",
    title: "Trivia Duel",
    urduTitle: "معلومات کا مقابلہ",
    description: "Head-to-head timed quiz with rapid point scoring and sweet shared celebration trivia.",
    icon: "⚡",
    badge: "Competitive · Timed",
    category: "competitive",
    isMultiplayerSupported: true,
    estimatedTime: "2-3 mins",
    washiColor: "rose",
  },
  {
    id: "escape-room",
    title: "Cooperative Escape Room",
    urduTitle: "پہیلی کا کمرہ",
    description: "Multi-stage cooperative mystery: crack ciphers, find music box codes, and unlock the garden sanctuary.",
    icon: "🗝️",
    badge: "Cooperative · Puzzles",
    category: "cooperative",
    isMultiplayerSupported: true,
    estimatedTime: "4-6 mins",
    washiColor: "sage",
  },
  {
    id: "would-you-rather",
    title: "Would You Rather?",
    urduTitle: "انتخاب کیجیے",
    description: "Heartwarming party game with cozy romantic dilemmas and playful choices.",
    icon: "💖",
    badge: "Social · Party",
    category: "social",
    isMultiplayerSupported: true,
    estimatedTime: "2-4 mins",
    washiColor: "rose",
  },
  {
    id: "daily-word",
    title: "Daily Word Puzzle",
    urduTitle: "لفظ کا معمہ",
    description: "5-letter solo daily word challenge with color-coded tile feedback describing Meerah's joyful spirit.",
    icon: "🔤",
    badge: "Solo · Daily",
    category: "solo",
    isMultiplayerSupported: false,
    estimatedTime: "2-3 mins",
    washiColor: "gold",
  },
] as const;

const registryComponents: Partial<Record<GameId, GameComponentType>> = {};

/** Register a React component for a game ID */
export function registerGameComponent(id: GameId, component: GameComponentType): void {
  registryComponents[id] = component;
}

/** Get a game definition by ID with its registered component attached if present */
export function getGameDefinition(id: GameId): GameDefinition | undefined {
  const def = GAME_DEFINITIONS.find((g) => g.id === id);
  if (!def) return undefined;
  return {
    ...def,
    component: registryComponents[id] || def.component,
  };
}

/** Get all registered games with components attached if present */
export function getAllGames(): GameDefinition[] {
  return GAME_DEFINITIONS.map((def) => ({
    ...def,
    component: registryComponents[def.id] || def.component,
  }));
}

/* ============================================================================
 * 1. WORD SCRAMBLE ENGINE & DATA
 * ============================================================================ */

export interface ScrambleWord {
  id: string;
  word: string;
  clue: string;
  category: string;
}

export const SCRAMBLE_WORDS: readonly ScrambleWord[] = [
  {
    id: "sunflower",
    word: "SUNFLOWER",
    clue: "Bright, blooming flower that always turns toward the warm golden light 🌻",
    category: "Nature & Sunshine",
  },
  {
    id: "sunshine",
    word: "SUNSHINE",
    clue: "The radiant warmth Meerah brings into every heart and room ☀️",
    category: "Warmth",
  },
  {
    id: "cupcake",
    word: "CUPCAKE",
    clue: "Sweet frosted birthday treat baked with pure delight 🧁",
    category: "Birthday Sweet",
  },
  {
    id: "memories",
    word: "MEMORIES",
    clue: "Treasured moments of shared laughter we cherish forever 📸",
    category: "Heartfelt Love",
  },
  {
    id: "celebration",
    word: "CELEBRATION",
    clue: "A joyful gathering filled with music, smiles, and birthday cake 🎈",
    category: "Milestone",
  },
] as const;

/** Deterministic scrambler that guarantees scrambled output differs from original when length > 1 */
export function scrambleWordLetters(word: string, seed = 13): string[] {
  const chars = word.toUpperCase().split("");
  if (chars.length <= 1) return chars;

  // Pseudo-random deterministic shuffle with seed
  const arr = [...chars];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // If the shuffle accidentally equals the original, rotate by 1
  if (arr.join("") === word.toUpperCase()) {
    const first = arr.shift()!;
    arr.push(first);
  }

  return arr;
}

export interface WordScrambleState {
  wordIndex: number;
  currentWord: string;
  clue: string;
  category: string;
  scrambledLetters: string[];
  selectedIndices: number[];
  inputGuess: string;
  score: number;
  streak: number;
  hintsRemaining: number;
  revealedCount: number;
  status: "playing" | "correct" | "completed";
  feedbackMessage?: string;
}

export function createWordScrambleState(
  words: readonly ScrambleWord[] = SCRAMBLE_WORDS,
  startIndex = 0
): WordScrambleState {
  const activeWord = words[startIndex] || words[0];
  const scrambled = scrambleWordLetters(activeWord.word, startIndex + 7);

  return {
    wordIndex: startIndex,
    currentWord: activeWord.word,
    clue: activeWord.clue,
    category: activeWord.category,
    scrambledLetters: scrambled,
    selectedIndices: [],
    inputGuess: "",
    score: 0,
    streak: 0,
    hintsRemaining: 3,
    revealedCount: 0,
    status: "playing",
  };
}

export function selectLetterTile(state: WordScrambleState, tileIndex: number): WordScrambleState {
  if (state.status !== "playing") return state;
  if (state.selectedIndices.includes(tileIndex)) return state;

  const newIndices = [...state.selectedIndices, tileIndex];
  const newGuess = newIndices.map((idx) => state.scrambledLetters[idx]).join("");

  return {
    ...state,
    selectedIndices: newIndices,
    inputGuess: newGuess,
    feedbackMessage: undefined,
  };
}

export function removeLastLetter(state: WordScrambleState): WordScrambleState {
  if (state.status !== "playing" || state.selectedIndices.length === 0) return state;

  const newIndices = state.selectedIndices.slice(0, -1);
  const newGuess = newIndices.map((idx) => state.scrambledLetters[idx]).join("");

  return {
    ...state,
    selectedIndices: newIndices,
    inputGuess: newGuess,
    feedbackMessage: undefined,
  };
}

export function clearLetterTiles(state: WordScrambleState): WordScrambleState {
  if (state.status !== "playing") return state;
  return {
    ...state,
    selectedIndices: [],
    inputGuess: "",
    feedbackMessage: undefined,
  };
}

export function applyScrambleHint(state: WordScrambleState): WordScrambleState {
  if (state.status !== "playing") return state;
  if (state.hintsRemaining <= 0) {
    return { ...state, feedbackMessage: "No hints remaining! You can do it!" };
  }

  const nextRevealed = Math.min(state.revealedCount + 1, state.currentWord.length);
  return {
    ...state,
    hintsRemaining: state.hintsRemaining - 1,
    revealedCount: nextRevealed,
    feedbackMessage: `Hint: The first ${nextRevealed} letter${nextRevealed > 1 ? "s are" : " is"} "${state.currentWord.slice(0, nextRevealed)}"`,
  };
}

export const useScrambleHint = applyScrambleHint;

export function submitScrambleGuess(
  state: WordScrambleState,
  words: readonly ScrambleWord[] = SCRAMBLE_WORDS
): WordScrambleState {
  if (state.status !== "playing") return state;

  const guess = state.inputGuess.trim().toUpperCase();
  if (guess.length === 0) {
    return { ...state, feedbackMessage: "Select or type letters to form a word first!" };
  }

  if (guess === state.currentWord.toUpperCase()) {
    const isLastWord = state.wordIndex >= words.length - 1;
    const addedScore = 100 + state.streak * 25;
    const newScore = state.score + addedScore;
    const newStreak = state.streak + 1;

    if (isLastWord) {
      return {
        ...state,
        score: newScore,
        streak: newStreak,
        status: "completed",
        feedbackMessage: "🎉 Spectacular! You solved all words!",
      };
    }

    return {
      ...state,
      score: newScore,
      streak: newStreak,
      status: "correct",
      feedbackMessage: `✨ Correct! "${state.currentWord}" is unscrambled! (+${addedScore} pts)`,
    };
  }

  // Incorrect guess
  return {
    ...state,
    streak: 0,
    feedbackMessage: `Not quite "${guess}". Try again or use a hint!`,
  };
}

export function nextScrambleWord(
  state: WordScrambleState,
  words: readonly ScrambleWord[] = SCRAMBLE_WORDS
): WordScrambleState {
  const nextIdx = state.wordIndex + 1;
  if (nextIdx >= words.length) {
    return {
      ...state,
      status: "completed",
      feedbackMessage: "🎉 You have completed all words!",
    };
  }

  const nextWordObj = words[nextIdx];
  const scrambled = scrambleWordLetters(nextWordObj.word, nextIdx + 7);

  return {
    ...state,
    wordIndex: nextIdx,
    currentWord: nextWordObj.word,
    clue: nextWordObj.clue,
    category: nextWordObj.category,
    scrambledLetters: scrambled,
    selectedIndices: [],
    inputGuess: "",
    revealedCount: 0,
    status: "playing",
    feedbackMessage: undefined,
  };
}

export function resetWordScramble(words: readonly ScrambleWord[] = SCRAMBLE_WORDS): WordScrambleState {
  return createWordScrambleState(words, 0);
}

/* ============================================================================
 * 2. BIRTHDAY QUIZ ENGINE & DATA
 * ============================================================================ */

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  funFact: string;
}

export const BIRTHDAY_QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  {
    id: 1,
    question: "What color palette best captures Meerah's warmth and aesthetic?",
    options: [
      "Warm sunflower gold & soft rose pink",
      "Neon electric highlighter green",
      "Cold industrial steel grey",
      "Midnight fluorescent orange",
    ],
    correctIndex: 0,
    explanation: "Soft rose, ivory, and golden sunflower petals reflect Meerah's gentle elegance.",
    funFact: "Her favourite tones bring cozy sunshine wherever she goes! 🌻",
  },
  {
    id: 2,
    question: "What is Meerah's secret superpower whenever she enters a room?",
    options: [
      "Instant warmth, contagious laughter & making everyone feel cherished",
      "Teleporting away into quiet shadows",
      "Giving 45-minute formal PowerPoint presentations",
      "Organizing spreadsheets by font family",
    ],
    correctIndex: 0,
    explanation: "Her genuine smile and radiant aura put everyone instantly at ease.",
    funFact: "Even the gloomiest days brighten up around her! ☀️",
  },
  {
    id: 3,
    question: "What makes a birthday celebration truly unforgettable for Meerah?",
    options: [
      "Noisy commercial spectacles with loud fireworks",
      "Heartfelt touches, sweet memories, and time with people she loves",
      "A 50-page itinerary with strict hourly check-ins",
      "Sleeping through the entire day undisturbed",
    ],
    correctIndex: 1,
    explanation: "It's always the sentimental memories, personal notes, and loving warmth.",
    funFact: "A small handwritten thought means more to her than any grand gesture! 💌",
  },
  {
    id: 4,
    question: "Which of these gifts feels like it was handmade especially for Meerah?",
    options: [
      "A pack of AA batteries and a screwdriver",
      "A nostalgic scrapbook filled with photos, flowers & sweet melodies",
      "A dictionary of corporate tax laws",
      "A set of cold metal kitchen tongs",
    ],
    correctIndex: 1,
    explanation: "Scrapbook keepsakes, blooms, and music speak right to her romantic heart.",
    funFact: "Every page turned holds a treasured memory! 📖🌸",
  },
  {
    id: 5,
    question: "What is our deepest birthday wish for Meerah this year and always?",
    options: [
      "Endless joy, glowing health, laughter, and every beautiful dream coming true",
      "More 8:00 AM Monday morning meetings",
      "Misplacing her favourite shoes",
      "Running out of warm chai on cold rainy days",
    ],
    correctIndex: 0,
    explanation: "May every single day be bathed in grace, health, happiness, and fulfilled dreams!",
    funFact: "She deserves the entire universe of sweetness! 💖✨",
  },
] as const;

export interface QuizAnswerRecord {
  questionId: number;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface BirthdayQuizState {
  currentQuestionIndex: number;
  selectedOptionIndex: number | null;
  score: number;
  isAnswerSubmitted: boolean;
  isQuizCompleted: boolean;
  userAnswers: QuizAnswerRecord[];
}

export function createBirthdayQuizState(): BirthdayQuizState {
  return {
    currentQuestionIndex: 0,
    selectedOptionIndex: null,
    score: 0,
    isAnswerSubmitted: false,
    isQuizCompleted: false,
    userAnswers: [],
  };
}

export function selectQuizOption(
  state: BirthdayQuizState,
  optionIndex: number,
  questions: readonly QuizQuestion[] = BIRTHDAY_QUIZ_QUESTIONS
): BirthdayQuizState {
  if (state.isAnswerSubmitted || state.isQuizCompleted) return state;

  const currentQ = questions[state.currentQuestionIndex];
  if (!currentQ) return state;

  const isCorrect = optionIndex === currentQ.correctIndex;
  const newScore = isCorrect ? state.score + 1 : state.score;

  const newAnswers: QuizAnswerRecord[] = [
    ...state.userAnswers,
    {
      questionId: currentQ.id,
      selectedIndex: optionIndex,
      isCorrect,
    },
  ];

  return {
    ...state,
    selectedOptionIndex: optionIndex,
    score: newScore,
    isAnswerSubmitted: true,
    userAnswers: newAnswers,
  };
}

export function advanceQuizQuestion(
  state: BirthdayQuizState,
  questions: readonly QuizQuestion[] = BIRTHDAY_QUIZ_QUESTIONS
): BirthdayQuizState {
  if (!state.isAnswerSubmitted) return state;

  const nextIndex = state.currentQuestionIndex + 1;
  const isCompleted = nextIndex >= questions.length;

  return {
    ...state,
    currentQuestionIndex: isCompleted ? state.currentQuestionIndex : nextIndex,
    selectedOptionIndex: null,
    isAnswerSubmitted: false,
    isQuizCompleted: isCompleted,
  };
}

export function resetBirthdayQuiz(): BirthdayQuizState {
  return createBirthdayQuizState();
}

export function getQuizCelebrationMessage(
  score: number,
  total: number
): { badge: string; title: string; message: string } {
  const percentage = total > 0 ? (score / total) * 100 : 0;

  if (percentage === 100) {
    return {
      badge: "💖 Pure Soulmate Score",
      title: "Perfect 5 out of 5!",
      message:
        "You know Meerah's heart, humor, and soul inside and out! She brings pure sunshine to this world, and you clearly cherish every ray of it. Happy Birthday, Meerah! 🎂✨",
    };
  } else if (percentage >= 60) {
    return {
      badge: "🌸 Cherished Friend Score",
      title: `Sweet ${score} out of ${total}!`,
      message:
        "You truly know and celebrate the wonderful qualities that make Meerah so unforgettable and loved. May her special day overflow with smiles! 🌷♡",
    };
  } else {
    return {
      badge: "💌 Sweet Explorer Score",
      title: `${score} out of ${total} Learned & Loved!`,
      message:
        "Every day with Meerah is a beautiful chance to discover more of her kindness, warmth, and delightful laughter. Happy Birthday, Meerah! 🎈",
    };
  }
}

/* ============================================================================
 * 3. MEMORY MATCH STATE MACHINE HELPERS
 * ============================================================================ */

export const MEMORY_SYMBOLS = ["🌷", "🎂", "✿", "🎁", "♡", "🌙", "☀", "🦋", "🌸", "💌", "🎵", "🌺"] as const;

export interface MemoryTileState {
  id: number;
  symbol: string;
  flipped: boolean;
  matched: boolean;
}

export interface MemoryMatchGameState {
  tiles: MemoryTileState[];
  flippedIndices: number[];
  moves: number;
  matchedPairs: number;
  totalPairs: number;
  isWon: boolean;
  isLocked: boolean;
}

export function buildMemoryDeckState(pairCount = 6, symbols = MEMORY_SYMBOLS): MemoryTileState[] {
  const activeSymbols = symbols.slice(0, pairCount);
  const pairs = [...activeSymbols, ...activeSymbols];
  // Deterministic shuffle helper for tests or random
  const tiles: MemoryTileState[] = pairs.map((symbol, id) => ({
    id,
    symbol,
    flipped: false,
    matched: false,
  }));
  return tiles;
}

export function createMemoryMatchState(pairCount = 6): MemoryMatchGameState {
  const tiles = buildMemoryDeckState(pairCount);
  return {
    tiles,
    flippedIndices: [],
    moves: 0,
    matchedPairs: 0,
    totalPairs: pairCount,
    isWon: false,
    isLocked: false,
  };
}

export function flipMemoryCard(state: MemoryMatchGameState, tileId: number): MemoryMatchGameState {
  if (state.isLocked) return state;

  const tile = state.tiles.find((t) => t.id === tileId);
  if (!tile || tile.flipped || tile.matched) return state;
  if (state.flippedIndices.length === 1 && state.flippedIndices[0] === tileId) return state;

  const nextFlipped = [...state.flippedIndices, tileId];
  const updatedTiles = state.tiles.map((t) => (t.id === tileId ? { ...t, flipped: true } : t));

  if (nextFlipped.length === 2) {
    const moves = state.moves + 1;
    const [idA, idB] = nextFlipped;
    const tileA = updatedTiles.find((t) => t.id === idA)!;
    const tileB = updatedTiles.find((t) => t.id === idB)!;

    if (tileA.symbol === tileB.symbol) {
      const matchedTiles = updatedTiles.map((t) =>
        t.id === idA || t.id === idB ? { ...t, matched: true } : t
      );
      const matchedPairs = state.matchedPairs + 1;
      const isWon = matchedPairs >= state.totalPairs;

      return {
        ...state,
        tiles: matchedTiles,
        flippedIndices: [],
        moves,
        matchedPairs,
        isWon,
        isLocked: false,
      };
    } else {
      // Need unlock / unflip step
      return {
        ...state,
        tiles: updatedTiles,
        flippedIndices: nextFlipped,
        moves,
        isLocked: true,
      };
    }
  }

  return {
    ...state,
    tiles: updatedTiles,
    flippedIndices: nextFlipped,
  };
}

export function resolveMismatchedCards(state: MemoryMatchGameState): MemoryMatchGameState {
  if (!state.isLocked || state.flippedIndices.length < 2) return state;

  const resetTiles = state.tiles.map((t) =>
    state.flippedIndices.includes(t.id) && !t.matched ? { ...t, flipped: false } : t
  );

  return {
    ...state,
    tiles: resetTiles,
    flippedIndices: [],
    isLocked: false,
  };
}

/* ============================================================================
 * 4. GAMES HUB NAVIGATION STATE MACHINE
 * ============================================================================ */

export interface GamesHubState {
  activeGameId: GameId | null;
  completedGames: Record<GameId, boolean>;
  gameScores: Partial<Record<GameId, number>>;
}

export function createGamesHubState(): GamesHubState {
  return {
    activeGameId: null,
    completedGames: {
      "memory-match": false,
      "word-scramble": false,
      "birthday-quiz": false,
      "connect-four": false,
      "trivia-duel": false,
      "escape-room": false,
      "would-you-rather": false,
      "daily-word": false,
    },
    gameScores: {},
  };
}

export function openGame(state: GamesHubState, gameId: GameId): GamesHubState {
  return {
    ...state,
    activeGameId: gameId,
  };
}

export function closeToHub(state: GamesHubState): GamesHubState {
  return {
    ...state,
    activeGameId: null,
  };
}

export function markGameCompleted(
  state: GamesHubState,
  gameId: GameId,
  score?: number
): GamesHubState {
  return {
    ...state,
    completedGames: {
      ...state.completedGames,
      [gameId]: true,
    },
    gameScores: {
      ...state.gameScores,
      ...(score !== undefined ? { [gameId]: score } : {}),
    },
  };
}
