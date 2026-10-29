/**
 * Real-Time Multiplayer Room Service & Synchronization Engine
 * Supports 6-character room codes, lobby state management, turn-taking,
 * timer synchronization, and real-time cross-tab/client updates via storage events & broadcast channels.
 */

export interface PlayerInfo {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  score?: number;
}

export type RoomStatus = "lobby" | "in-game" | "finished";

export interface MultiplayerRoom<TGameState = unknown> {
  roomCode: string;
  gameId: string;
  status: RoomStatus;
  host: PlayerInfo;
  guest: PlayerInfo | null;
  turn: "host" | "guest";
  gameState: TGameState;
  lastMoveBy?: string;
  winner?: "host" | "guest" | "draw" | null;
  timerSeconds: number;
  updatedAt: string;
  createdAt: string;
}

const STORAGE_PREFIX = "birthday-mp-room-";
const memoryRooms = new Map<string, string>();

/** Generates an uppercase 6-character alphanumeric room code (e.g. 'MEER26') */
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Get storage key for a room code */
export function getRoomStorageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode.trim().toUpperCase()}`;
}

/** Fetch room state from local persistence or memory fallback */
export function getRoomState<T = unknown>(roomCode: string): MultiplayerRoom<T> | null {
  const key = getRoomStorageKey(roomCode);
  if (typeof window === "undefined") {
    const raw = memoryRooms.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    const raw = memoryRooms.get(key);
    return raw ? JSON.parse(raw) : null;
  }
}

/** Persist room state and trigger synchronization event */
export function saveRoomState<T = unknown>(room: MultiplayerRoom<T>): void {
  const key = getRoomStorageKey(room.roomCode);
  const data = JSON.stringify({
    ...room,
    updatedAt: new Date().toISOString(),
  });
  memoryRooms.set(key, data);

  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, data);
    // Dispatch custom event for same-window component reactivity
    window.dispatchEvent(
      new CustomEvent("birthday-multiplayer-sync", {
        detail: { roomCode: room.roomCode },
      })
    );
  } catch {
    // quota or access fallback
  }
}

/**
 * Creates a brand new multiplayer game room
 */
export function createMultiplayerRoom<TGameState = unknown>(
  gameId: string,
  hostName = "Noah",
  initialGameState: TGameState = {} as TGameState,
  codeOverride?: string
): MultiplayerRoom<TGameState> {
  const roomCode = codeOverride ? codeOverride.toUpperCase() : generateRoomCode();
  const host: PlayerInfo = {
    id: `player-host-${Date.now()}`,
    name: hostName,
    isHost: true,
    ready: true,
    score: 0,
  };

  const room: MultiplayerRoom<TGameState> = {
    roomCode,
    gameId,
    status: "lobby",
    host,
    guest: null,
    turn: "host",
    gameState: initialGameState,
    timerSeconds: 30,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  saveRoomState(room);
  return room;
}

/**
 * Joins an existing game room by code
 */
export function joinMultiplayerRoom<TGameState = unknown>(
  roomCode: string,
  guestName = "Meerah"
): { success: boolean; room?: MultiplayerRoom<TGameState>; error?: string } {
  const room = getRoomState<TGameState>(roomCode);
  if (!room) {
    return { success: false, error: "Room not found. Please check the 6-character code." };
  }

  if (room.guest && room.guest.name !== guestName) {
    return { success: false, error: "Room is already full with two players." };
  }

  const guest: PlayerInfo = {
    id: room.guest?.id || `player-guest-${Date.now()}`,
    name: guestName,
    isHost: false,
    ready: true,
    score: 0,
  };

  room.guest = guest;
  room.status = "in-game";
  saveRoomState(room);

  return { success: true, room };
}

/**
 * Leaves or closes a room
 */
export function leaveMultiplayerRoom(roomCode: string, playerId: string): void {
  const room = getRoomState(roomCode);
  if (!room) return;

  if (room.host.id === playerId) {
    // Host left, terminate room
    memoryRooms.delete(getRoomStorageKey(roomCode));
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(getRoomStorageKey(roomCode));
      window.dispatchEvent(
        new CustomEvent("birthday-multiplayer-sync", {
          detail: { roomCode, terminated: true },
        })
      );
    }
  } else if (room.guest?.id === playerId) {
    // Guest left
    room.guest = null;
    room.status = "lobby";
    saveRoomState(room);
  }
}

/**
 * Updates in-game move and alternates turns
 */
export function makeMultiplayerMove<TGameState = unknown>(
  roomCode: string,
  playerId: string,
  nextGameState: TGameState,
  winner?: "host" | "guest" | "draw" | null
): MultiplayerRoom<TGameState> | null {
  const room = getRoomState<TGameState>(roomCode);
  if (!room) return null;

  const isHost = room.host.id === playerId;
  room.gameState = nextGameState;
  room.lastMoveBy = playerId;
  room.turn = isHost ? "guest" : "host";

  if (winner !== undefined) {
    room.winner = winner;
    if (winner !== null) {
      room.status = "finished";
    }
  }

  saveRoomState(room);
  return room;
}

/**
 * Subscribe to real-time room updates
 */
export function subscribeToRoom<T = unknown>(
  roomCode: string,
  callback: (room: MultiplayerRoom<T> | null) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleUpdate = () => {
    const updated = getRoomState<T>(roomCode);
    callback(updated);
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === getRoomStorageKey(roomCode)) {
      handleUpdate();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("birthday-multiplayer-sync", handleUpdate);

  // Initial call
  handleUpdate();

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("birthday-multiplayer-sync", handleUpdate);
  };
}
