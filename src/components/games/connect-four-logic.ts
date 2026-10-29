/**
 * Connect Four Pure Logic Engine
 */

export const ROWS = 6;
export const COLS = 7;
export type Player = "red" | "gold";
export type BoardCell = Player | null;

export function createEmptyBoard(): BoardCell[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function checkWin(board: BoardCell[][], row: number, col: number, player: Player): boolean {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    // Check forward
    for (let i = 1; i < 4; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
      } else {
        break;
      }
    }

    // Check backward
    for (let i = 1; i < 4; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        count++;
      } else {
        break;
      }
    }

    if (count >= 4) return true;
  }
  return false;
}
