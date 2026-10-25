/**
 * Birthday Release Engine — Server-Enforced Timezone Logic
 *
 * Target: October 30, 2026 00:00:00 IST (Asia/Kolkata, UTC+05:30)
 * Equivalent UTC: 2026-10-29T18:30:00.000Z
 */

export const BIRTHDAY_TARGET_ISO = "2026-10-30T00:00:00+05:30";
export const BIRTHDAY_TARGET_TIMESTAMP = 1793301000000; // Exact millisecond representation

export interface ReleaseState {
  isReleased: boolean;
  targetIso: string;
  targetTimestamp: number;
  currentServerTime: number;
  remainingMs: number;
  timezone: string;
}

export function getReleaseState(currentTimestamp: number = Date.now()): ReleaseState {
  const remaining = BIRTHDAY_TARGET_TIMESTAMP - currentTimestamp;
  return {
    isReleased: remaining <= 0,
    targetIso: BIRTHDAY_TARGET_ISO,
    targetTimestamp: BIRTHDAY_TARGET_TIMESTAMP,
    currentServerTime: currentTimestamp,
    remainingMs: Math.max(0, remaining),
    timezone: "Asia/Kolkata",
  };
}
