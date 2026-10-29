"use client";

import React, { useState, useMemo } from "react";
import "./games.css";
import {
  GAME_DEFINITIONS,
  GameCategory,
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
import {
  createMultiplayerRoom,
  joinMultiplayerRoom,
  leaveMultiplayerRoom,
  MultiplayerRoom,
} from "./multiplayer-service";

// Register components in the extensible registry
registerGameComponent("memory-match", MemoryMatch);
registerGameComponent("word-scramble", WordScramble);
registerGameComponent("birthday-quiz", BirthdayQuiz);
registerGameComponent("connect-four", ConnectFour);
registerGameComponent("trivia-duel", TriviaDuel);
registerGameComponent("escape-room", EscapeRoomPuzzle);
registerGameComponent("would-you-rather", WouldYouRather);
registerGameComponent("daily-word", DailyWordPuzzle);

export interface GamesPanelProps {
  initialGameId?: GameId | null;
  onSelectGame?: (gameId: GameId) => void;
  onGameComplete?: (gameId: GameId, score?: number) => void;
}

export function GamesPanel({
  initialGameId = null,
  onSelectGame,
  onGameComplete,
}: GamesPanelProps) {
  const [activeGameId, setActiveGameId] = useState<GameId | null>(initialGameId);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "all">("all");
  const [isMultiplayerMode, setIsMultiplayerMode] = useState<boolean>(false);
  const [roomState, setRoomState] = useState<MultiplayerRoom | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState<string>("");
  const [joinError, setJoinError] = useState<string>("");

  const [completedGames, setCompletedGames] = useState<Record<string, boolean>>({});
  const [gameScores, setGameScores] = useState<Partial<Record<string, number>>>({});
  // Incremented on restart to force fresh remount of game component
  const [restartKey, setRestartKey] = useState<number>(0);

  // Filter games by category
  const displayedGames = useMemo(() => {
    return GAME_DEFINITIONS.filter((game) => {
      if (selectedCategory === "all") return true;
      return game.category === selectedCategory;
    });
  }, [selectedCategory]);

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
            {activeGameId === "memory-match" && (
              <MemoryMatch
                onComplete={() => handleCompleteActiveGame()}
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
          {/* Hub Header */}
          <div className="gamesHubHeader">
            <span className="gamesHubKicker">BIRTHDAY ARCADE & SURPRISES · تفریحی کھیل</span>
            <h1 className="gamesHubTitle">
              Meerah&apos;s <i>Playful</i> Corner
            </h1>
            <p className="gamesHubSubtitle">
              Solo games and real-time multiplayer challenges crafted for shared laughter, competitive
              duels, cooperative escape rooms, and birthday surprises!
            </p>
          </div>

          {/* Mode & Category Bar */}
          <div className="gamesControlsSection">
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
                👥 Real-Time Multiplayer Room
              </button>
            </div>

            {/* Multiplayer Join Bar (shown when multiplayer mode active) */}
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

            {/* Category Filter Pills */}
            <div className="gamesCategoryBar" role="tablist" aria-label="Game categories">
              {(
                [
                  { id: "all", label: "All Games", icon: "✨" },
                  { id: "competitive", label: "Competitive", icon: "⚡" },
                  { id: "cooperative", label: "Cooperative", icon: "🗝️" },
                  { id: "social", label: "Social & Party", icon: "💖" },
                  { id: "solo", label: "Solo Puzzles", icon: "🌸" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === cat.id}
                  className={`categoryPill ${selectedCategory === cat.id ? "isActive" : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span aria-hidden="true">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Games Card Grid */}
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
                        Play Solo 🌸
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GamesPanel;
