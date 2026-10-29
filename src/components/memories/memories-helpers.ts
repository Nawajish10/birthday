import type { PhotoAsset } from "../../types/media-contracts.ts";
import {
  isOnThisDay,
  parseDateSafe,
  formatEffectiveDate,
} from "../../lib/birthday-dates.ts";
import { toCompactDerivativeUrl } from "../../lib/media-service.ts";

export { formatEffectiveDate, toCompactDerivativeUrl };

export type MemoriesTab = "camera" | "photos" | "all-photos" | "on-this-day" | "albums" | "stories";

export interface TimelineMonthGroup {
  year: number;
  month: number;
  title: string;
  photos: PhotoAsset[];
}

export interface OnThisDayYearGroup {
  year: number;
  yearsAgo: number;
  label: string;
  photos: PhotoAsset[];
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Returns celebratory milestone label for photos from past years.
 */
export function getOnThisDayLabel(yearsAgo: number): string {
  if (yearsAgo === 1) return "1 Year Ago Today ✿";
  if (yearsAgo === 2) return "2 Years Ago Today ✨";
  if (yearsAgo === 3) return "3 Years Ago Today ♡";
  if (yearsAgo === 4) return "4 Years Ago Today 🎂";
  if (yearsAgo === 5) return "5 Years Ago Today 🎈";
  return `${yearsAgo} Years Ago Today ✿`;
}

export const CHERISHED_MOMENTS_TITLE = "Cherished Moments ✿";
export const SPECIAL_MEMORIES_TITLE = "Special Memories";

export interface GroupChronologicalOptions {
  unknownGroupTitle?: string;
}

/**
 * Groups photos chronologically by Year & Month in descending order.
 * Photos without reliable capture dates are grouped under a curated collection
 * ("Cherished Moments ✿" or "Special Memories") without fabricating fake dates!
 */
export function groupPhotosChronologically(
  photos: PhotoAsset[],
  options?: GroupChronologicalOptions
): TimelineMonthGroup[] {
  if (!photos || photos.length === 0) return [];

  const knownMap = new Map<string, { year: number; month: number; title: string; photos: PhotoAsset[] }>();
  const unknownPhotos: PhotoAsset[] = [];

  for (const photo of photos) {
    if (photo.hasKnownCaptureDate && photo.effectiveCaptureDate) {
      const d = parseDateSafe(photo.effectiveCaptureDate);
      if (d) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const title = `${MONTH_NAMES[month]} ${year}`;

        if (!knownMap.has(key)) {
          knownMap.set(key, { year, month, title, photos: [] });
        }
        knownMap.get(key)!.photos.push(photo);
        continue;
      }
    }
    unknownPhotos.push(photo);
  }

  // Sort known month/year groups descending (most recent first)
  const sortedKeys = Array.from(knownMap.keys()).sort((a, b) => b.localeCompare(a));
  const result: TimelineMonthGroup[] = [];

  for (const key of sortedKeys) {
    const group = knownMap.get(key)!;
    group.photos.sort((a, b) => {
      const timeA = new Date(a.effectiveCaptureDate).getTime() || 0;
      const timeB = new Date(b.effectiveCaptureDate).getTime() || 0;
      return timeB - timeA;
    });
    result.push(group);
  }

  // Group unknown capture dates at the end under curated collection
  if (unknownPhotos.length > 0) {
    unknownPhotos.sort((a, b) => {
      const timeA = new Date(a.uploadTimestamp).getTime() || 0;
      const timeB = new Date(b.uploadTimestamp).getTime() || 0;
      return timeB - timeA;
    });
    const fallbackTitle = options?.unknownGroupTitle || CHERISHED_MOMENTS_TITLE;
    result.push({
      year: 0,
      month: -1,
      title: fallbackTitle,
      photos: unknownPhotos,
    });
  }

  return result;
}

/**
 * On This Day Engine:
 * Matches memories from the exact same month & day in prior years.
 * Strictly ignores photos with unknown capture dates.
 * Groups matching photos by year descending and assigns milestone labels.
 */
export function groupPhotosOnThisDay(
  photos: PhotoAsset[],
  referenceDate?: string | Date
): OnThisDayYearGroup[] {
  if (!photos || photos.length === 0) return [];
  const ref = parseDateSafe(referenceDate) || new Date();
  const currentYear = ref.getFullYear();

  const matchingPhotos: PhotoAsset[] = [];
  for (const photo of photos) {
    // STRICT RULE: Never match or fabricate for photos with unknown capture date
    if (!photo.hasKnownCaptureDate || !photo.effectiveCaptureDate) continue;

    if (isOnThisDay(photo.effectiveCaptureDate, ref, true)) {
      matchingPhotos.push(photo);
    }
  }

  if (matchingPhotos.length === 0) return [];

  // Group by year
  const yearMap = new Map<number, PhotoAsset[]>();
  for (const photo of matchingPhotos) {
    const d = parseDateSafe(photo.effectiveCaptureDate);
    if (!d) continue;
    const y = d.getFullYear();
    if (!yearMap.has(y)) {
      yearMap.set(y, []);
    }
    yearMap.get(y)!.push(photo);
  }

  // Sort descending by year (most recent past year first)
  const sortedYears = Array.from(yearMap.keys()).sort((a, b) => b - a);
  const result: OnThisDayYearGroup[] = [];

  for (const year of sortedYears) {
    const yearsAgo = currentYear - year;
    const groupPhotos = yearMap.get(year)!;
    result.push({
      year,
      yearsAgo,
      label: getOnThisDayLabel(yearsAgo),
      photos: groupPhotos,
    });
  }

  return result;
}
