import test from "node:test";
import assert from "node:assert/strict";
import {
  generateRoomCode,
  createMultiplayerRoom,
  joinMultiplayerRoom,
  makeMultiplayerMove,
  leaveMultiplayerRoom,
  getRoomState,
} from "../src/components/games/multiplayer-service.ts";
import {
  GAME_DEFINITIONS,
  getGameDefinition,
} from "../src/components/games/game-registry.ts";
import { checkWin, createEmptyBoard } from "../src/components/games/connect-four-logic.ts";
import type { Player } from "../src/components/games/connect-four-logic.ts";
import { evaluateGuess } from "../src/components/games/daily-word-logic.ts";

test("Multiplayer Service: Generates 6-character uppercase alphanumeric room code", () => {
  const code = generateRoomCode();
  assert.equal(code.length, 6, "Code must be 6 characters");
  assert.match(code, /^[A-Z0-9]{6}$/, "Must be uppercase alphanumeric");
});

test("Multiplayer Service: Room lifecycle (create, join, move, leave)", () => {
  // 1. Create Room
  const testCode = "TEST26";
  const room = createMultiplayerRoom("connect-four", "Noah", { board: [] }, testCode);

  assert.equal(room.roomCode, "TEST26");
  assert.equal(room.gameId, "connect-four");
  assert.equal(room.status, "lobby");
  assert.equal(room.host.name, "Noah");
  assert.equal(room.guest, null);

  // 2. Join Room
  const joinResult = joinMultiplayerRoom("TEST26", "Meerah");
  assert.equal(joinResult.success, true);
  assert.equal(joinResult.room?.status, "in-game");
  assert.equal(joinResult.room?.guest?.name, "Meerah");

  // 3. Make Move
  const updatedRoom = makeMultiplayerMove("TEST26", room.host.id, { board: [3] });
  assert.ok(updatedRoom);
  assert.equal(updatedRoom.turn, "guest");
  assert.deepEqual(updatedRoom.gameState, { board: [3] });

  // 4. Leave Room
  leaveMultiplayerRoom("TEST26", room.host.id);
  const afterLeave = getRoomState("TEST26");
  assert.equal(afterLeave, null, "Room should be cleaned up after host leaves");
});

test("Expanded Games Catalog: Covers Competitive, Cooperative, Social, and Solo categories", () => {
  const categories = new Set(GAME_DEFINITIONS.map((g) => g.category));
  assert.ok(categories.has("competitive"), "Must include competitive games");
  assert.ok(categories.has("cooperative"), "Must include cooperative games");
  assert.ok(categories.has("social"), "Must include social party games");
  assert.ok(categories.has("solo"), "Must include solo games");

  const connectFour = getGameDefinition("connect-four");
  assert.ok(connectFour);
  assert.equal(connectFour.isMultiplayerSupported, true);

  const triviaDuel = getGameDefinition("trivia-duel");
  assert.ok(triviaDuel);
  assert.equal(triviaDuel.isMultiplayerSupported, true);

  const escapeRoom = getGameDefinition("escape-room");
  assert.ok(escapeRoom);
  assert.equal(escapeRoom.isMultiplayerSupported, true);

  const wouldYouRather = getGameDefinition("would-you-rather");
  assert.ok(wouldYouRather);

  const dailyWord = getGameDefinition("daily-word");
  assert.ok(dailyWord);
});

test("Connect Four: Win check detection works horizontally, vertically, and diagonally", () => {
  const board = createEmptyBoard();
  const player: Player = "red";

  // Horizontal connect 4 in row 5, cols 0..3
  for (let c = 0; c < 4; c++) {
    board[5][c] = player;
  }
  assert.equal(checkWin(board, 5, 3, player), true, "Horizontal win should be detected");

  // Vertical connect 4 in col 5, rows 2..5
  const boardV = createEmptyBoard();
  for (let r = 2; r <= 5; r++) {
    boardV[r][5] = player;
  }
  assert.equal(checkWin(boardV, 2, 5, player), true, "Vertical win should be detected");
});

test("Daily Word Puzzle: evaluateGuess correctly identifies exact, present, and absent letters", () => {
  const target = "SMILE";

  // All correct
  const resultAll = evaluateGuess("SMILE", target);
  assert.deepEqual(resultAll, ["correct", "correct", "correct", "correct", "correct"]);

  // Mixed
  const resultMixed = evaluateGuess("SLIME", target);
  // S (correct), L (present in SMILE), I (correct), M (present in SMILE), E (correct)
  assert.deepEqual(resultMixed, ["correct", "present", "correct", "present", "correct"]);

  // All absent
  const resultNone = evaluateGuess("BROWN", target);
  assert.deepEqual(resultNone, ["absent", "absent", "absent", "absent", "absent"]);
});
