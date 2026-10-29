"use client";

import React, { useState, useCallback } from "react";

export interface TicTacToeProps {
  onComplete?: (score: number) => void;
  onRestart?: () => void;
}

type SquareValue = "✿" | "☀️" | null;

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(squares: SquareValue[]): { winner: SquareValue; line: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line };
    }
  }
  return { winner: null, line: null };
}

export function TicTacToe({ onComplete, onRestart }: TicTacToeProps) {
  const [board, setBoard] = useState<SquareValue[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true); // true = Meerah (✿), false = Noah / AI (☀️)
  const [gameMode, setGameMode] = useState<"ai" | "pvp">("ai");
  const [scores, setScores] = useState<{ p1: number; p2: number; ties: number }>({
    p1: 0,
    p2: 0,
    ties: 0,
  });

  const { winner, line: winningLine } = checkWinner(board);
  const isDraw = !winner && board.every((sq) => sq !== null);

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    onRestart?.();
  }, [onRestart]);

  const makeMove = useCallback(
    (index: number, currentBoard: SquareValue[], symbol: "✿" | "☀️") => {
      if (currentBoard[index] !== null || winner || isDraw) return null;

      const nextBoard = [...currentBoard];
      nextBoard[index] = symbol;

      const result = checkWinner(nextBoard);
      if (result.winner === "✿") {
        setScores((prev) => ({ ...prev, p1: prev.p1 + 1 }));
        onComplete?.(100);
      } else if (result.winner === "☀️") {
        setScores((prev) => ({ ...prev, p2: prev.p2 + 1 }));
      } else if (nextBoard.every((sq) => sq !== null)) {
        setScores((prev) => ({ ...prev, ties: prev.ties + 1 }));
      }

      return nextBoard;
    },
    [winner, isDraw, onComplete]
  );

  const handleCellClick = (index: number) => {
    if (board[index] || winner || isDraw) return;
    if (gameMode === "ai" && !isXNext) return; // Wait for AI

    const newBoard = makeMove(index, board, "✿");
    if (!newBoard) return;

    setBoard(newBoard);
    setIsXNext(false);

    // AI Turn
    if (gameMode === "ai" && !checkWinner(newBoard).winner && newBoard.some((sq) => sq === null)) {
      setTimeout(() => {
        // AI chooses best or random move
        const availableIndices = newBoard
          .map((val, idx) => (val === null ? idx : null))
          .filter((val): val is number => val !== null);

        if (availableIndices.length === 0) return;

        // 1. Can AI win on this turn?
        let chosenMove: number | null = null;
        for (const idx of availableIndices) {
          const testBoard = [...newBoard];
          testBoard[idx] = "☀️";
          if (checkWinner(testBoard).winner === "☀️") {
            chosenMove = idx;
            break;
          }
        }

        // 2. Can AI block Meerah's winning move?
        if (chosenMove === null) {
          for (const idx of availableIndices) {
            const testBoard = [...newBoard];
            testBoard[idx] = "✿";
            if (checkWinner(testBoard).winner === "✿") {
              chosenMove = idx;
              break;
            }
          }
        }

        // 3. Center square preference
        if (chosenMove === null && newBoard[4] === null) {
          chosenMove = 4;
        }

        // 4. Random available move
        if (chosenMove === null) {
          chosenMove = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        }

        const aiBoard = makeMove(chosenMove, newBoard, "☀️");
        if (aiBoard) {
          setBoard(aiBoard);
          setIsXNext(true);
        }
      }, 350);
    } else if (gameMode === "pvp") {
      setIsXNext((prev) => !prev);
    }
  };

  return (
    <div className="ticTacToeContainer" aria-label="Tic Tac Toe Birthday Classic">
      <div className="tttHeader">
        <span className="tttUrdu">کاٹا صفر · تفریحی مقابلہ</span>
        <h3 className="tttTitle">Tic Tac Toe · Blossom Duel</h3>
        <p className="tttSub">
          Meerah plays with Rose Petals (✿), Noah/AI plays with Golden Sun (☀️)!
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="tttModeSwitch">
        <button
          className={`tttModeBtn ${gameMode === "ai" ? "isActive" : ""}`}
          onClick={() => {
            setGameMode("ai");
            resetBoard();
          }}
        >
          🤖 Vs Cozy AI
        </button>
        <button
          className={`tttModeBtn ${gameMode === "pvp" ? "isActive" : ""}`}
          onClick={() => {
            setGameMode("pvp");
            resetBoard();
          }}
        >
          👥 Pass & Play (2 Players)
        </button>
      </div>

      {/* Scoreboard */}
      <div className="tttScoreboard">
        <div className={`scoreCard ${isXNext && !winner && !isDraw ? "activeTurn" : ""}`}>
          <span className="playerSymbol">✿</span>
          <span className="playerName">Meerah</span>
          <span className="playerScore">{scores.p1}</span>
        </div>
        <div className="scoreCard ties">
          <span className="playerSymbol">🤝</span>
          <span className="playerName">Ties</span>
          <span className="playerScore">{scores.ties}</span>
        </div>
        <div className={`scoreCard ${!isXNext && !winner && !isDraw ? "activeTurn" : ""}`}>
          <span className="playerSymbol">☀️</span>
          <span className="playerName">{gameMode === "ai" ? "Cozy AI" : "Noah"}</span>
          <span className="playerScore">{scores.p2}</span>
        </div>
      </div>

      {/* Board */}
      <div className="tttBoardWrapper">
        <div className="tttGrid">
          {board.map((val, idx) => {
            const isWinningCell = winningLine?.includes(idx);
            return (
              <button
                key={idx}
                className={`tttCell ${val ? "hasVal" : ""} ${isWinningCell ? "isWinning" : ""}`}
                onClick={() => handleCellClick(idx)}
                disabled={Boolean(val) || Boolean(winner) || isDraw}
                aria-label={`Cell ${idx + 1}: ${val || "Empty"}`}
              >
                {val}
              </button>
            );
          })}
        </div>

        {/* Status / Celebration message */}
        <div className="tttStatusBar">
          {winner && (
            <div className="winnerBanner">
              <span>🎉</span>
              <strong>
                {winner === "✿"
                  ? "Meerah blooms victorious! ♡"
                  : gameMode === "ai"
                  ? "Cozy AI placed three sunbeams in a row!"
                  : "Noah won this round!"}
              </strong>
            </div>
          )}
          {isDraw && (
            <div className="drawBanner">
              <span>✨</span>
              <strong>A sweet draw! Perfectly matched minds.</strong>
            </div>
          )}
          {!winner && !isDraw && (
            <div className="turnBanner">
              Current turn:{" "}
              <strong>
                {isXNext ? "Meerah (✿)" : gameMode === "ai" ? "Cozy AI (☀️)..." : "Noah (☀️)"}
              </strong>
            </div>
          )}

          <button className="button secondary tttRestartBtn" onClick={resetBoard}>
            New Round ↺
          </button>
        </div>
      </div>
    </div>
  );
}
export default TicTacToe;
