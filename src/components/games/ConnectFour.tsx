"use client";

import React, { useState, useEffect, useCallback } from "react";
import "./games.css";
import {
  ROWS,
  COLS,
  Player,
  BoardCell,
  createEmptyBoard,
  checkWin,
} from "./connect-four-logic";

export { ROWS, COLS, createEmptyBoard, checkWin };
export type { Player, BoardCell };

export interface ConnectFourProps {
  onComplete?: (winner: Player | "draw") => void;
  onRestart?: () => void;
  isMultiplayer?: boolean;
  playerRole?: "host" | "guest";
  onSendMove?: (col: number) => void;
  remoteColMove?: number | null;
}

export function ConnectFour({
  onComplete,
  onRestart,
  isMultiplayer = false,
  playerRole = "host",
  onSendMove,
  remoteColMove = null,
}: ConnectFourProps) {
  const [board, setBoard] = useState<BoardCell[][]>(createEmptyBoard);
  const [turn, setTurn] = useState<Player>("red"); // Host is red, Guest is gold
  const [winner, setWinner] = useState<Player | "draw" | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const myPlayer: Player = playerRole === "host" ? "red" : "gold";
  const isMyTurn = !isMultiplayer || turn === myPlayer;

  const dropDisc = useCallback(
    (col: number, isRemote = false) => {
      if (winner || (!isMyTurn && !isRemote)) return;

      // Find lowest available row in column
      let targetRow = -1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (!board[r][col]) {
          targetRow = r;
          break;
        }
      }

      if (targetRow === -1) return; // Column full

      const currentTurn = turn;
      const newBoard = board.map((row) => [...row]);
      newBoard[targetRow][col] = currentTurn;
      setBoard(newBoard);

      if (!isRemote && onSendMove) {
        onSendMove(col);
      }

      if (checkWin(newBoard, targetRow, col, currentTurn)) {
        setWinner(currentTurn);
        onComplete?.(currentTurn);
      } else {
        const isFull = newBoard.every((row) => row.every((c) => c !== null));
        if (isFull) {
          setWinner("draw");
          onComplete?.("draw");
        } else {
          setTurn(currentTurn === "red" ? "gold" : "red");
        }
      }
    },
    [board, turn, winner, isMyTurn, onSendMove, onComplete]
  );

  // Handle remote move
  useEffect(() => {
    if (remoteColMove !== null && remoteColMove !== undefined) {
      const timer = setTimeout(() => {
        dropDisc(remoteColMove, true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [remoteColMove, dropDisc]);

  const handleReset = () => {
    setBoard(createEmptyBoard());
    setTurn("red");
    setWinner(null);
    onRestart?.();
  };

  return (
    <div className="connectFourContainer" aria-label="Connect Four Duel">
      <div className="connectFourHeader">
        <h3 className="connectFourTitle">Connect Four &middot; چار کا جوڑ</h3>
        <p className="connectFourSubtitle">
          Drop your tokens to connect 4 in a row horizontally, vertically, or diagonally!
        </p>
      </div>

      <div className="connectFourStatusBar">
        {winner ? (
          <div className="connectFourWinnerBanner">
            {winner === "draw" ? (
              <span>It&apos;s a Draw! Well played both! 🤝</span>
            ) : (
              <span>
                🏆 Winner: <strong>{winner === "red" ? "Red Heart ❤️" : "Gold Star ⭐"}</strong>!
              </span>
            )}
          </div>
        ) : (
          <div className="connectFourTurnIndicator">
            Turn:{" "}
            <span
              className={`turnPill ${turn === "red" ? "turnRed" : "turnGold"}`}
            >
              {turn === "red" ? "Red Token (Player 1)" : "Gold Token (Player 2)"}
            </span>
            {isMultiplayer && (
              <span className="mpTurnNotice">
                {isMyTurn ? " (Your Turn!)" : " (Waiting for opponent...)"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connect Four Grid */}
      <div className="connectFourBoard">
        <div className="connectFourDropZone" role="toolbar" aria-label="Column select buttons">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              className={`connectFourDropBtn ${hoverCol === c ? "isHovered" : ""}`}
              onClick={() => dropDisc(c)}
              onMouseEnter={() => setHoverCol(c)}
              onMouseLeave={() => setHoverCol(null)}
              disabled={Boolean(winner) || !isMyTurn || board[0][c] !== null}
              aria-label={`Drop token in column ${c + 1}`}
            >
              ▼
            </button>
          ))}
        </div>

        <div className="connectFourGrid">
          {board.map((row, r) => (
            <div key={r} className="connectFourRow">
              {row.map((cell, c) => (
                <div key={c} className="connectFourSlot">
                  <div
                    className={`connectFourDisc ${
                      cell === "red"
                        ? "discRed"
                        : cell === "gold"
                        ? "discGold"
                        : "discEmpty"
                    }`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="connectFourControls">
        <button type="button" className="connectFourResetBtn" onClick={handleReset}>
          Reset Match ↺
        </button>
      </div>
    </div>
  );
}

export default ConnectFour;
