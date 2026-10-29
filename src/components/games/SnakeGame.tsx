"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface SnakeGameProps {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 16;
const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 8 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 }; // Moving UP
const FOOD_ICONS = ["🧁", "🌻", "🍓", "💖", "🎂", "🌸"];

function getRandomFood(snake: Point[]): { point: Point; icon: string } {
  const empty: Point[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!snake.some((s) => s.x === x && s.y === y)) {
        empty.push({ x, y });
      }
    }
  }
  const point = empty[Math.floor(Math.random() * empty.length)] || { x: 4, y: 4 };
  const icon = FOOD_ICONS[Math.floor(Math.random() * FOOD_ICONS.length)];
  return { point, icon };
}

export function SnakeGame({ onComplete, onRestart }: SnakeGameProps) {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<{ point: Point; icon: string }>(() =>
    getRandomFood(INITIAL_SNAKE)
  );
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("meerah_snake_high");
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  const directionRef = useRef<Point>(INITIAL_DIRECTION);
  const nextDirectionRef = useRef<Point>(INITIAL_DIRECTION);

  const restartGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setFood(getRandomFood(INITIAL_SNAKE));
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setHasStarted(false);
    onRestart?.();
  }, [onRestart]);

  const changeDirection = useCallback((dir: Point) => {
    // Prevent 180 reverse turns
    if (dir.x !== 0 && dir.x === -directionRef.current.x) return;
    if (dir.y !== 0 && dir.y === -directionRef.current.y) return;
    nextDirectionRef.current = dir;
    setHasStarted(true);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      if (e.key === " " || e.key === "p" || e.key === "P") {
        setIsPaused((p) => !p);
        return;
      }
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          changeDirection({ x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          changeDirection({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          changeDirection({ x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          changeDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection]);

  // Game loop tick
  useEffect(() => {
    if (isGameOver || isPaused || !hasStarted) return;

    const speed = Math.max(90, 160 - Math.floor(score / 50) * 10);
    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        directionRef.current = nextDirectionRef.current;
        const head = prevSnake[0];
        const newHead: Point = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y,
        };

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setIsGameOver(true);
          onComplete?.(score);
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsGameOver(true);
          onComplete?.(score);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food eaten?
        if (newHead.x === food.point.x && newHead.y === food.point.y) {
          const newScore = score + 10;
          setScore(newScore);
          if (newScore > highScore) {
            setHighScore(newScore);
            if (typeof window !== "undefined") {
              localStorage.setItem("meerah_snake_high", newScore.toString());
            }
          }
          setFood(getRandomFood(newSnake));
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [isGameOver, isPaused, hasStarted, score, highScore, food, onComplete]);

  return (
    <div className="snakeGameContainer" aria-label="Retro Birthday Snake Arcade">
      <div className="snakeHeader">
        <div>
          <span className="snakeUrdu">سانپ کا کھیل · آرکیڈ</span>
          <h3 className="snakeTitle">Birthday Snake Arcade</h3>
          <p className="snakeSub">
            Collect sweet birthday cupcakes and golden sunflowers without hitting walls!
          </p>
        </div>

        <div className="snakeStats">
          <div className="scorePill">
            <span className="scoreLabel">SCORE</span>
            <span className="scoreVal">{score}</span>
          </div>
          <div className="scorePill best">
            <span className="scoreLabel">BEST</span>
            <span className="scoreVal">{highScore}</span>
          </div>
          <button
            className="button secondary"
            onClick={() => setIsPaused((p) => !p)}
            style={{ padding: "5px 12px", fontSize: "11px" }}
          >
            {isPaused ? "Resume ▶" : "Pause ❚❚"}
          </button>
        </div>
      </div>

      {/* Arcade Screen Viewport */}
      <div className="snakeBoard">
        <div className="snakeGrid">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
            const x = idx % GRID_SIZE;
            const y = Math.floor(idx / GRID_SIZE);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isBody = !isHead && snake.some((s) => s.x === x && s.y === y);
            const isFood = food.point.x === x && food.point.y === y;

            return (
              <div
                key={idx}
                className={`snakeCell ${isHead ? "snakeHead" : ""} ${
                  isBody ? "snakeBody" : ""
                } ${isFood ? "snakeFood" : ""}`}
              >
                {isFood && <span>{food.icon}</span>}
                {isHead && <span className="snakeFace">✿</span>}
              </div>
            );
          })}
        </div>

        {/* Start Prompt Overlay */}
        {!hasStarted && !isGameOver && (
          <div className="snakeOverlay">
            <span>🧁</span>
            <h4>Ready to Play?</h4>
            <p>Press any Arrow Key or Tap Controls to Start!</p>
            <button
              className="button primary"
              onClick={() => {
                setHasStarted(true);
                changeDirection({ x: 0, y: -1 });
              }}
            >
              Start Snake ▶
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="snakeOverlay gameOverOverlay">
            <span>💫</span>
            <h4>Game Over!</h4>
            <p>You gathered {score} sweet birthday points!</p>
            <button className="button primary" onClick={restartGame}>
              Play Again ↺
            </button>
          </div>
        )}
      </div>

      {/* D-Pad Controls for Touch and Mobile */}
      <div className="snakeControls" aria-label="Arcade Controls">
        <div className="dpadRow">
          <button
            className="dpadBtn"
            onClick={() => changeDirection({ x: 0, y: -1 })}
            aria-label="Up"
          >
            ▲
          </button>
        </div>
        <div className="dpadRow">
          <button
            className="dpadBtn"
            onClick={() => changeDirection({ x: -1, y: 0 })}
            aria-label="Left"
          >
            ◀
          </button>
          <button
            className="dpadBtn"
            onClick={() => changeDirection({ x: 0, y: 1 })}
            aria-label="Down"
          >
            ▼
          </button>
          <button
            className="dpadBtn"
            onClick={() => changeDirection({ x: 1, y: 0 })}
            aria-label="Right"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
export default SnakeGame;
