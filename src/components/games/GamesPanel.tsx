"use client";

import React, { useState, useMemo } from "react";
import "./games.css";
import {
  GAME_DEFINITIONS,
  GameHubFilter,
  GameId,
  getGameDefinition,
  registerGameComponent,
} from "./game-registry";
import { MemoryMatch } from "./MemoryMatch";
import { WordScramble } from "./WordScramble";
import { BirthdayQuiz } from "./BirthdayQuiz";
import { ConnectFour } from "./ConnectFour";
import { TriviaDuel } from "./TriviaDuel";
import { EscapeRoomPuzzle } from "./EscapeRoomPuzzle";
import { WouldYouRather } from "./WouldYouRather";
import { DailyWordPuzzle } from "./DailyWordPuzzle";
import { Game2048 } from "./Game2048";
import { TicTacToe } from "./TicTacToe";
import { SnakeGame } from "./SnakeGame";
import { WordHunt } from "./WordHunt";
import { TypingRush } from "./TypingRush";
import { ColorMatch } from "./ColorMatch";
import { MathQuiz } from "./MathQuiz";
import {
  createMultiplayerRoom,
  joinMultiplayerRoom,
  leaveMultiplayerRoom,
  MultiplayerRoom,
} from "./multiplayer-service";

// Register all components in the extensible registry
registerGameComponent("2048", Game2048);
registerGameComponent("memory-match", MemoryMatch);
registerGameComponent("tic-tac-toe", TicTacToe);
registerGameComponent("snake", SnakeGame);
registerGameComponent("word-hunt", WordHunt);
registerGameComponent("typing-rush", TypingRush);
registerGameComponent("color-match", ColorMatch);
registerGameComponent("math-quiz", MathQuiz);
registerGameComponent("birthday-quiz", BirthdayQuiz);
registerGameComponent("connect-four", ConnectFour);
registerGameComponent("trivia-duel", TriviaDuel);
registerGameComponent("escape-room", EscapeRoomPuzzle);
registerGameComponent("would-you-rather", WouldYouRather);
registerGameComponent("daily-word", DailyWordPuzzle);
registerGameComponent("word-scramble", WordScramble);

export interface GamesPanelProps {
  initialGameId?: GameId | null;
  onSelectGame?: (gameId: GameId) => void;
  onGameComplete?: (gameId: GameId, score?: number) => void;
}

const FILTER_PILLS: readonly { id: "All" | GameHubFilter; label: string; icon: string }[] = [
  { id: "All", label: "All", icon: "✨" },
  { id: "Puzzle", label: "Puzzle", icon: "🧩" },
  { id: "Arcade", label: "Arcade", icon: "🕹️" },
  { id: "Classic", label: "Classic", icon: "🎲" },
  { id: "Fun", label: "Fun", icon: "💖" },
];

export function GamesPanel({
  initialGameId = null,
  onSelectGame,
  onGameComplete,
}: GamesPanelProps) {
  const [activeGameId, setActiveGameId] = useState<GameId | null>(initialGameId);
  const [selectedFilter, setSelectedFilter] = useState<"All" | GameHubFilter>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isMultiplayerMode, setIsMultiplayerMode] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<MultiplayerRoom | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [joinError, setJoinError] = useState<string>("");

  const [completedGames, setCompletedGames] = useState<Record<string, boolean>>({});
  const [gameScores, setGameScores] = useState<Partial<Record<string, number>>>({});
  // Incremented on restart to force fresh remount of active game component
  const [restartKey, setRestartKey] = useState<number>(0);

  // Filter games by category pill and search query
  const displayedGames = useMemo(() => {
    return GAME_DEFINITIONS.filter((game) => {
      // 1. Filter pill check
      if (selectedFilter !== "All" && game.hubFilter !== selectedFilter) {
        return false;
      }
      // 2. Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesDesc = game.description.toLowerCase().includes(q);
        const matchesBadge = game.badge.toLowerCase().includes(q);
        const matchesUrdu = game.urduTitle.includes(q);
        return matchesTitle || matchesDesc || matchesBadge || matchesUrdu;
      }
      return true;
    });
  }, [selectedFilter, searchQuery]);

  const handleLaunchGame = (id: GameId) => {
    setActiveGameId(id);
    onSelectGame?.(id);
  };

  const handleBackToHub = () => {
    if (roomState) {
      leaveMultiplayerRoom(roomState.roomCode, roomState.host.id);
      setRoomState(null);
    }
    setActiveGameId(null);
  };

  const handleRestartActiveGame = () => {
    setRestartKey((prev) => prev + 1);
  };

  const handleCompleteActiveGame = (score?: number) => {
    if (activeGameId) {
      setCompletedGames((prev) => ({ ...prev, [activeGameId]: true }));
      if (score !== undefined) {
        setGameScores((prev) => ({ ...prev, [activeGameId]: score }));
      }
      onGameComplete?.(activeGameId, score);
    }
  };

  // Multiplayer room creation
  const handleCreateRoom = (gameId: GameId) => {
    const room = createMultiplayerRoom(gameId, "Noah");
    setRoomState(room);
    setActiveGameId(gameId);
  };

  // Multiplayer room joining
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    const result = joinMultiplayerRoom(joinCodeInput.trim(), "Meerah");
    if (result.success && result.room) {
      setRoomState(result.room);
      setActiveGameId(result.room.gameId as GameId);
    } else {
      setJoinError(result.error || "Could not join room. Check code.");
    }
  };

  const activeGameDef = activeGameId ? getGameDefinition(activeGameId) : null;

  // Custom visual thumbnail renderer for each game card
  const renderCardThumbnail = (id: GameId) => {
    switch (id) {
      case "2048":
        return (
          <div className="thumb2048">
            <div className="miniTile t2">2</div>
            <div className="miniTile t4">4</div>
            <div className="miniTile t8">8</div>
            <div className="miniTile t2048">2048</div>
          </div>
        );
      case "memory-match":
        return (
          <div className="thumbMemory">
            <div className="miniCard back">✿</div>
            <div className="miniCard front">
              <span>🌷</span>
              <small>شعر</small>
            </div>
          </div>
        );
      case "tic-tac-toe":
        return (
          <div className="thumbTTT">
            <div className="miniTTTRow">
              <span>✿</span>
              <span className="dot">·</span>
              <span>☀️</span>
            </div>
            <div className="miniTTTRow">
              <span className="dot">·</span>
              <span>✿</span>
              <span className="dot">·</span>
            </div>
          </div>
        );
      case "snake":
        return (
          <div className="thumbSnake">
            <div className="snakeTrack">
              <span className="snakeSegment">●</span>
              <span className="snakeSegment">●</span>
              <span className="snakeHead">✿</span>
              <span className="snakeFood">🧁</span>
            </div>
          </div>
        );
      case "word-hunt":
      case "word-scramble":
        return (
          <div className="thumbWord">
            <span className="wordTile">M</span>
            <span className="wordTile">E</span>
            <span className="wordTile">E</span>
            <span className="wordTile">R</span>
            <span className="wordTile glow">A</span>
          </div>
        );
      case "typing-rush":
        return (
          <div className="thumbTyping">
            <div className="keycapRow">
              <span className="keycap">W</span>
              <span className="keycap">P</span>
              <span className="keycap">M</span>
            </div>
            <div className="speedBar">
              <div className="speedFill" />
              <span className="speedBolt">⚡</span>
            </div>
          </div>
        );
      case "color-match":
        return (
          <div className="thumbColor">
            <span className="colorDot rose" />
            <span className="colorDot gold" />
            <span className="colorDot sage" />
            <span className="colorDot lavender" />
          </div>
        );
      case "math-quiz":
        return (
          <div className="thumbMath">
            <span className="mathEquation">24 + 100 = 💖</span>
            <span className="mathStar">★</span>
          </div>
        );
      case "birthday-quiz":
        return (
          <div className="thumbBirthday">
            <span className="cakeIcon">🎂</span>
            <span className="quizBadge">5 Qs</span>
          </div>
        );
      case "connect-four":
        return (
          <div className="thumbC4">
            <div className="c4GridMini">
              <span className="c4Chip r" />
              <span className="c4Chip y" />
              <span className="c4Chip r" />
              <span className="c4Chip y" />
            </div>
          </div>
        );
      case "trivia-duel":
        return (
          <div className="thumbTrivia">
            <span className="triviaVs">VS</span>
            <span className="triviaBolt">⚡</span>
          </div>
        );
      case "escape-room":
        return (
          <div className="thumbEscape">
            <span className="escapeKey">🗝️</span>
            <span className="escapeLock">🔒</span>
          </div>
        );
      case "would-you-rather":
        return (
          <div className="thumbWYR">
            <span className="wyrBubble left">A ♡</span>
            <span className="wyrBubble right">B ✿</span>
          </div>
        );
      case "daily-word":
        return (
          <div className="thumbDaily">
            <span className="dailyTile correct">S</span>
            <span className="dailyTile present">M</span>
            <span className="dailyTile correct">I</span>
            <span className="dailyTile absent">L</span>
            <span className="dailyTile correct">E</span>
          </div>
        );
      default:
        return <div className="thumbDefault">✿</div>;
    }
  };

  return (
    <div className="gamesPanel" aria-label="Meerah's Birthday Games">
      {/* 1. ACTIVE GAME VIEW */}
      {activeGameId && activeGameDef ? (
        <div className="activeGameView">
          {/* Top Navigation Bar */}
          <div className="activeGameTopBar">
            <button
              className="backToHubButton"
              onClick={handleBackToHub}
              aria-label="Back to all games"
            >
              ← Back to all games
            </button>

            <div className="activeGameTitleGroup">
              <span className="activeGameUrdu">{activeGameDef.urduTitle}</span>
              <h2 className="activeGameTitle">{activeGameDef.title}</h2>
              {roomState && (
                <span className="mpRoomBadge">
                  Room: <strong>{roomState.roomCode}</strong> (2 Players)
                </span>
              )}
            </div>

            <button
              className="activeGameRestartButton"
              onClick={handleRestartActiveGame}
              aria-label={`Restart ${activeGameDef.title}`}
            >
              Restart ↺
            </button>
          </div>

          {/* Active Game Container */}
          <div className="activeGameCanvas" key={`${activeGameId}-${restartKey}`}>
            {activeGameId === "2048" && (
              <Game2048
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "memory-match" && (
              <MemoryMatch
                onComplete={() => handleCompleteActiveGame(100)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "tic-tac-toe" && (
              <TicTacToe
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "snake" && (
              <SnakeGame
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "word-hunt" && (
              <WordHunt
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "typing-rush" && (
              <TypingRush
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "color-match" && (
              <ColorMatch
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "math-quiz" && (
              <MathQuiz
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "word-scramble" && (
              <WordScramble
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "birthday-quiz" && (
              <BirthdayQuiz
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "connect-four" && (
              <ConnectFour
                isMultiplayer={Boolean(roomState)}
                onComplete={() => handleCompleteActiveGame()}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "trivia-duel" && (
              <TriviaDuel
                isMultiplayer={Boolean(roomState)}
                onComplete={(score) => handleCompleteActiveGame(score)}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "escape-room" && (
              <EscapeRoomPuzzle
                onComplete={() => handleCompleteActiveGame()}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "would-you-rather" && (
              <WouldYouRather
                onComplete={() => handleCompleteActiveGame()}
                onRestart={handleRestartActiveGame}
              />
            )}
            {activeGameId === "daily-word" && (
              <DailyWordPuzzle
                onComplete={(attempts) => handleCompleteActiveGame(attempts)}
                onRestart={handleRestartActiveGame}
              />
            )}
          </div>
        </div>
      ) : (
        /* 2. GAMES HUB VIEW */
        <div className="gamesHubView">
          {/* Header with Wordmark "Meerah ✿" & Search Input */}
          <div className="gamesHubHeader">
            <div className="gamesHubTopNav">
              <div className="gamesWordmark">
                Meerah <span>✿</span>
              </div>
              <div className="gamesSearchWrapper">
                <span className="gamesSearchIcon" aria-hidden="true">
                  🔍
                </span>
                <input
                  type="search"
                  className="gamesSearchInput"
                  placeholder="Search games..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search games"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="gamesSearchClearBtn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="gamesHubHero">
              <span className="gamesHubKicker">BIRTHDAY ARCADE & SURPRISES · تفریحی کھیل</span>
              <h1 className="gamesHubTitle">
                Meerah&apos;s <i>Playful</i> Corner
              </h1>
              <p className="gamesHubSubtitle">
                Interactive puzzles, couplet card matching, classic duels, and retro arcade games
                crafted with loving warmth for Meerah&apos;s celebration!
              </p>
            </div>
          </div>

          {/* Controls Section: Filter Pills & Solo/Multiplayer Mode */}
          <div className="gamesControlsSection">
            {/* Filter Pills: All, Puzzle, Arcade, Classic, Fun */}
            <div className="gamesFilterBar" role="tablist" aria-label="Game categories">
              {FILTER_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedFilter === pill.id}
                  className={`filterPill ${selectedFilter === pill.id ? "isActive" : ""}`}
                  onClick={() => setSelectedFilter(pill.id)}
                >
                  <span className="filterPillIcon" aria-hidden="true">
                    {pill.icon}
                  </span>
                  <span className="filterPillLabel">{pill.label}</span>
                </button>
              ))}
            </div>

            {/* Mode Switcher: Solo vs Multiplayer */}
            <div className="gamesModeToggle">
              <button
                type="button"
                className={`gamesModeBtn ${!isMultiplayerMode ? "isActive" : ""}`}
                onClick={() => setIsMultiplayerMode(false)}
              >
                🎮 Solo Play (Instant)
              </button>
              <button
                type="button"
                className={`gamesModeBtn ${isMultiplayerMode ? "isActive" : ""}`}
                onClick={() => setIsMultiplayerMode(true)}
              >
                👥 2-Player Room
              </button>
            </div>

            {/* Multiplayer Join Bar (shown when multiplayer mode is active) */}
            {isMultiplayerMode && (
              <div className="mpJoinLobby">
                <form onSubmit={handleJoinRoom} className="mpJoinForm">
                  <span className="mpJoinLabel">Join Friend&apos;s Room:</span>
                  <input
                    type="text"
                    className="mpJoinInput"
                    placeholder="Enter 6-char code (e.g. MEER26)"
                    maxLength={6}
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  />
                  <button type="submit" className="mpJoinBtn">
                    Join Room →
                  </button>
                </form>
                {joinError && <p className="mpJoinError">{joinError}</p>}
              </div>
            )}
          </div>

          {/* Games Card Grid */}
          {displayedGames.length > 0 ? (
            <div className="gamesHubGrid">
              {displayedGames.map((game) => {
                const isCompleted = completedGames[game.id];
                const score = gameScores[game.id];

                const washiClass =
                  game.washiColor === "gold"
                    ? "washiGold"
                    : game.washiColor === "rose"
                    ? "washiRose"
                    : "washiSage";

                const iconColorClass =
                  game.washiColor === "rose"
                    ? "rose"
                    : game.washiColor === "sage"
                    ? "sage"
                    : "";

                return (
                  <div key={game.id} className="gameCard">
                    {/* Scrapbook Washi Tape Accent */}
                    <div className={`gameCardWashi ${washiClass}`} aria-hidden="true" />

                    {/* Visual Thumbnail Banner */}
                    <div className={`gameCardThumbnail ${game.id}`}>
                      {renderCardThumbnail(game.id)}
                    </div>

                    {/* Card Top */}
                    <div className="gameCardTop">
                      <span className={`gameCardIcon ${iconColorClass}`} aria-hidden="true">
                        {game.icon}
                      </span>
                      <div className="gameCardBadges">
                        <span className="gameBadge">{game.badge}</span>
                        {game.isMultiplayerSupported && (
                          <span className="multiplayerBadge">👥 2 Players</span>
                        )}
                        {isCompleted && (
                          <span className="completedBadge">
                            ✓ Completed {score !== undefined ? `(${score} pts)` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Urdu & English Titles */}
                    <div className="gameCardUrdu" dir="rtl">
                      {game.urduTitle}
                    </div>
                    <h3 className="gameCardTitle">{game.title}</h3>

                    {/* Description */}
                    <p className="gameCardDesc">{game.description}</p>

                    {/* Footer with Estimated Time & Play Action */}
                    <div className="gameCardFooter">
                      <span className="gameTimeNote">⏱ {game.estimatedTime}</span>
                      {isMultiplayerMode && game.isMultiplayerSupported ? (
                        <button
                          className="gamePlayButton"
                          onClick={() => handleCreateRoom(game.id)}
                          aria-label={`Create room for ${game.title}`}
                        >
                          Create Room 👥
                        </button>
                      ) : (
                        <button
                          className="gamePlayButton"
                          onClick={() => handleLaunchGame(game.id)}
                          aria-label={`Play ${game.title}`}
                        >
                          Play Now ▶
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State when search returns no games */
            <div className="gamesEmptyState">
              <span className="emptyIcon">🔍</span>
              <h3>No games found</h3>
              <p>We couldn&apos;t find any games matching &ldquo;{searchQuery}&rdquo;.</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("All");
                }}
              >
                Show All Games 🌸
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GamesPanel;
