import type { BirthdayCountdownResult, PhotoAsset } from "../types/media-contracts.ts";

/**
 * Checks if a given year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Parse input into a Date object or null if invalid.
 */
export function parseDateSafe(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Authoritative recipient birthday constants.
 * Recipient birth date: 30 October 2001 (30/10/2001).
 */
export const AUTHORITATIVE_BIRTH_DATE = "2001-10-30";
export const DEFAULT_BIRTH_DATE = "2001-10-30";

/**
 * Authoritative Age Calculation.
 * Calculates age given a birth date and optional reference date.
 * Defaults to 28 October 2002. Never hardcodes age values.
 */
export function calculateAge(birthDateInput: string | Date = DEFAULT_BIRTH_DATE, referenceDateInput?: string | Date): number {
  const birth = parseDateSafe(birthDateInput);
  if (!birth) return 0;
  const ref = parseDateSafe(referenceDateInput) || new Date();

  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();

  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Authoritative Next Birthday Countdown.
 * Handles leap years (Feb 29 celebrated Feb 28 in non-leap years).
 * Returns live breakdown of days, hours, minutes, seconds and isToday flag.
 * Defaults to 28 October 2002.
 */
export function calculateNextBirthdayCountdown(
  birthDateInput: string | Date = DEFAULT_BIRTH_DATE,
  referenceDateInput?: string | Date
): BirthdayCountdownResult {
  const birth = parseDateSafe(birthDateInput);
  const now = parseDateSafe(referenceDateInput) || new Date();

  if (!birth) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isToday: false,
      nextBirthday: now,
    };
  }

  const birthMonth = birth.getMonth();
  const birthDay = birth.getDate();
  const currentYear = now.getFullYear();

  // Resolve target day for currentYear (handling Feb 29)
  let targetDay = birthDay;
  if (birthMonth === 1 && birthDay === 29 && !isLeapYear(currentYear)) {
    targetDay = 28; // Documented policy: celebrate Feb 28 in non-leap years
  }

  // Next birthday candidate for current year
  let targetDate = new Date(currentYear, birthMonth, targetDay, 0, 0, 0, 0);

  // Check if today is the birthday
  const isToday =
    now.getMonth() === birthMonth &&
    (now.getDate() === birthDay || (birthMonth === 1 && birthDay === 29 && !isLeapYear(currentYear) && now.getDate() === 28));

  // If birthday already passed this year (and not today), roll forward to next year
  if (!isToday && now.getTime() > targetDate.getTime() + 24 * 60 * 60 * 1000 - 1) {
    const nextYear = currentYear + 1;
    let nextTargetDay = birthDay;
    if (birthMonth === 1 && birthDay === 29 && !isLeapYear(nextYear)) {
      nextTargetDay = 28;
    }
    targetDate = new Date(nextYear, birthMonth, nextTargetDay, 0, 0, 0, 0);
  }

  if (isToday) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isToday: true,
      nextBirthday: targetDate,
    };
  }

  const diffMs = Math.max(0, targetDate.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isToday: false,
    nextBirthday: targetDate,
  };
}

/**
 * On This Day Discovery.
 * Evaluates whether a photo belongs to "On This Day" (same month and day in a prior year).
 * Strict Rule: Never fabricates or matches dates for photos with unknown capture dates.
 */
export function isOnThisDay(
  effectiveDateInput: string | Date,
  referenceDateInput?: string | Date,
  hasKnownCaptureDate: boolean = true
): boolean {
  if (!hasKnownCaptureDate) return false;
  const photoDate = parseDateSafe(effectiveDateInput);
  if (!photoDate) return false;
  const ref = parseDateSafe(referenceDateInput) || new Date();

  // Photo must be from a strictly prior year
  if (photoDate.getFullYear() >= ref.getFullYear()) return false;

  const photoMonth = photoDate.getMonth();
  const photoDay = photoDate.getDate();
  const refMonth = ref.getMonth();
  const refDay = ref.getDate();

  // Handle Feb 29 photos on non-leap years matching Feb 28
  if (photoMonth === 1 && photoDay === 29 && !isLeapYear(ref.getFullYear()) && refMonth === 1 && refDay === 28) {
    return true;
  }

  return photoMonth === refMonth && photoDay === refDay;
}

/**
 * Groups photos by effective capture year.
 * Photos without a known capture date are placed under year 0 (Unknown).
 */
export function groupPhotosByCaptureYear(photos: PhotoAsset[]): Record<number, PhotoAsset[]> {
  const groups: Record<number, PhotoAsset[]> = {};

  for (const photo of photos) {
    let year = 0;
    if (photo.hasKnownCaptureDate && photo.effectiveCaptureDate) {
      const d = parseDateSafe(photo.effectiveCaptureDate);
      if (d) year = d.getFullYear();
    }

    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(photo);
  }

  return groups;
}

/**
 * Format effective date into human-readable string.
 */
export function formatEffectiveDate(dateStr?: string, hasKnownCaptureDate: boolean = true): string {
  if (!hasKnownCaptureDate || !dateStr) return "Date unknown";
  const d = parseDateSafe(dateStr);
  if (!d) return "Date unknown";

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
