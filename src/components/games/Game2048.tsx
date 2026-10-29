"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";

export interface Game2048Props {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

type Board = number[][]; // 4x4 matrix

function createEmptyBoard(): Board {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

function getRandomEmptyCell(board: Board): { r: number; c: number } | null {
  const empty: { r: number; c: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return null;
  const idx = Math.floor(Math.random() * empty.length);
  return empty[idx];
}

function spawnRandomTile(board: Board): Board {
  const cell = getRandomEmptyCell(board);
  if (!cell) return board;
  const newBoard = board.map((row) => [...row]);
  newBoard[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
  return newBoard;
}

function initBoard(): Board {
  let board = createEmptyBoard();
  board = spawnRandomTile(board);
  board = spawnRandomTile(board);
  return board;
}

// Slide and merge a single row to the left
function slideLeft(row: number[]): { newRow: number[]; scoreGained: number } {
  const filtered = row.filter((val) => val !== 0);
  const newRow: number[] = [];
  let scoreGained = 0;

  for (let i = 0; i < filtered.length; i++) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      newRow.push(merged);
      scoreGained += merged;
      i++; // Skip merged partner
    } else {
      newRow.push(filtered[i]);
    }
  }

  while (newRow.length < 4) {
    newRow.push(0);
  }

  return { newRow, scoreGained };
}

function rotateBoard(board: Board): Board {
  // Rotate 90 degrees clockwise
  const rotated = createEmptyBoard();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      rotated[c][3 - r] = board[r][c];
    }
  }
  return rotated;
}

function boardsEqual(a: Board, b: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function canMove(board: Board): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export function Game2048({ onComplete, onRestart }: Game2048Props) {
  const [board, setBoard] = useState<Board>(() => initBoard());
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("meerah_2048_best");
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [hasWon, setHasWon] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [keepPlayingAfterWin, setKeepPlayingAfterWin] = useState<boolean>(false);

  // Swipe detection refs
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const resetGame = useCallback(() => {
    const fresh = initBoard();
    setBoard(fresh);
    setScore(0);
    setHasWon(false);
    setIsGameOver(false);
    setKeepPlayingAfterWin(false);
    onRestart?.();
  }, [onRestart]);

  const move = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (isGameOver) return;

      let current = board;
      let rotations = 0;

      if (direction === "up") {
        current = rotateBoard(rotateBoard(rotateBoard(current)));
        rotations = 1;
      } else if (direction === "right") {
        current = rotateBoard(rotateBoard(current));
        rotations = 2;
      } else if (direction === "down") {
        current = rotateBoard(current);
        rotations = 3;
      }

      let totalScoreGained = 0;
      const moved: Board = [];

      for (let r = 0; r < 4; r++) {
        const { newRow, scoreGained } = slideLeft(current[r]);
        moved.push(newRow);
        totalScoreGained += scoreGained;
      }

      // Rotate back
      let restored = moved;
      for (let i = 0; i < (4 - rotations) % 4; i++) {
        restored = rotateBoard(restored);
      }

      if (!boardsEqual(board, restored)) {
        const nextBoard = spawnRandomTile(restored);
        const nextScore = score + totalScoreGained;
        setBoard(nextBoard);
        setScore(nextScore);

        if (nextScore > bestScore) {
          setBestScore(nextScore);
          if (typeof window !== "undefined") {
            localStorage.setItem("meerah_2048_best", nextScore.toString());
          }
        }

        // Check for 2048 win
        if (!hasWon && !keepPlayingAfterWin) {
          const reached2048 = nextBoard.some((row) => row.some((val) => val >= 2048));
          if (reached2048) {
            setHasWon(true);
            onComplete?.(nextScore);
          }
        }

        // Check for game over
        if (!canMove(nextBoard)) {
          setIsGameOver(true);
          onComplete?.(nextScore);
        }
      }
    },
    [board, score, bestScore, isGameOver, hasWon, keepPlayingAfterWin, onComplete]
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          move("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          move("right");
          break;
        case "ArrowUp":
        case "w":
        case "W":
          move("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          move("down");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [move]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartRef.current.x;
    const dy = endY - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 30) {
      if (absDx > absDy) {
        move(dx > 0 ? "right" : "left");
      } else {
        move(dy > 0 ? "down" : "up");
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div
      className="game2048Container"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="2048 Birthday Edition"
    >
      <div className="game2048Header">
        <div className="game2048TitleGroup">
          <span className="game2048Urdu">اعداد کا کھیل · ۲۴</span>
          <h3 className="game2048Title">2048 Bloom</h3>
          <p className="game2048Sub">Join numbers to reach Meerah&apos;s 2048 flower tile!</p>
        </div>

        <div className="game2048Scores">
          <div className="scorePill">
            <span className="scoreLabel">SCORE</span>
            <span className="scoreVal">{score}</span>
          </div>
          <div className="scorePill best">
            <span className="scoreLabel">BEST</span>
            <span className="scoreVal">{bestScore}</span>
          </div>
          <button className="game2048ResetBtn" onClick={resetGame} title="Restart game">
            ↺ Restart
          </button>
        </div>
      </div>

      {/* Board & Tiles */}
      <div className="game2048GridWrapper">
        <div className="game2048Grid">
          {board.map((row, r) =>
            row.map((val, c) => (
              <div
                key={`${r}-${c}`}
                className={`tile2048 ${val > 0 ? `tile-${val}` : "tile-empty"}`}
              >
                {val > 0 ? (
                  <span className="tileValue">
                    {val === 2048 ? "✿ 2048" : val}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>

        {/* Win Overlay */}
        {hasWon && !keepPlayingAfterWin && (
          <div className="overlay2048 winOverlay">
            <span className="overlayIcon">🎉</span>
            <h4>2048 Reached!</h4>
            <p>You bloomed the highest golden flower for Meerah! ♡</p>
            <div className="overlayButtons">
              <button
                className="button primary"
                onClick={() => setKeepPlayingAfterWin(true)}
              >
                Keep Playing
              </button>
              <button className="button secondary" onClick={resetGame}>
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="overlay2048 overOverlay">
            <span className="overlayIcon">✨</span>
            <h4>Game Over</h4>
            <p>Score: {score} points. Beautiful effort!</p>
            <button className="button primary" onClick={resetGame}>
              Try Again ↺
            </button>
          </div>
        )}
      </div>

      {/* Touch Directional Controls for Mobile */}
      <div className="game2048Controls" aria-label="Directional controls">
        <div className="dpadRow">
          <button
            className="dpadBtn"
            onClick={() => move("up")}
            aria-label="Move Up"
          >
            ▲
          </button>
        </div>
        <div className="dpadRow">
          <button
            className="dpadBtn"
            onClick={() => move("left")}
            aria-label="Move Left"
          >
            ◀
          </button>
          <button
            className="dpadBtn"
            onClick={() => move("down")}
            aria-label="Move Down"
          >
            ▼
          </button>
          <button
            className="dpadBtn"
            onClick={() => move("right")}
            aria-label="Move Right"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
export default Game2048;
