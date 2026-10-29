import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAge,
  calculateNextBirthdayCountdown,
  isOnThisDay,
  groupPhotosByCaptureYear,
  formatEffectiveDate,
  isLeapYear,
} from "../src/lib/birthday-dates.ts";
import type { PhotoAsset } from "../src/types/media-contracts.ts";

test("Birthday Dates Engine: Leap Year Detection", () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2020), true);
  assert.equal(isLeapYear(2000), true);
  assert.equal(isLeapYear(2026), false);
  assert.equal(isLeapYear(2025), false);
  assert.equal(isLeapYear(1900), false);
});

test("Birthday Dates Engine: calculateAge", () => {
  // Born 2002-10-29, test on 2026-10-28 (day before birthday)
  assert.equal(calculateAge("2002-10-29", "2026-10-28"), 23);

  // Born 2002-10-29, test on 2026-10-29 (on birthday)
  assert.equal(calculateAge("2002-10-29", "2026-10-29"), 24);

  // Born 2002-10-29, test on 2026-10-30 (day after birthday)
  assert.equal(calculateAge("2002-10-29", "2026-10-30"), 24);

  // Born Feb 29 on leap year (2000-02-29), tested on 2026-02-28
  assert.equal(calculateAge("2000-02-29", "2026-02-27"), 25);
  assert.equal(calculateAge("2000-02-29", "2026-03-01"), 26);

  // Invalid date input
  assert.equal(calculateAge("invalid-date", "2026-10-29"), 0);
});

test("Birthday Dates Engine: calculateNextBirthdayCountdown", () => {
  // Test when today is the birthday
  const countdownToday = calculateNextBirthdayCountdown("2002-10-29", "2026-10-29T12:00:00");
  assert.equal(countdownToday.isToday, true);
  assert.equal(countdownToday.days, 0);

  // Test when birthday is in 10 days
  const countdownFuture = calculateNextBirthdayCountdown("2002-10-29", "2026-10-19T00:00:00");
  assert.equal(countdownFuture.isToday, false);
  assert.equal(countdownFuture.days, 10);

  // Test when birthday already passed this year (e.g. 2026-10-30 tested for 2002-10-29 birthday)
  const countdownNextYear = calculateNextBirthdayCountdown("2002-10-29", "2026-10-31T00:00:00");
  assert.equal(countdownNextYear.isToday, false);
  assert.equal(countdownNextYear.nextBirthday.getFullYear(), 2027);

  // Test leap year birthday in non-leap year (celebrated Feb 28)
  const leapCountdown = calculateNextBirthdayCountdown("2000-02-29", "2026-02-28T10:00:00");
  assert.equal(leapCountdown.isToday, true);
});

test("Birthday Dates Engine: isOnThisDay", () => {
  // Photo from exactly 2 years ago today
  assert.equal(isOnThisDay("2024-10-29", "2026-10-29", true), true);

  // Photo from 5 years ago today
  assert.equal(isOnThisDay("2021-10-29T14:30:00Z", "2026-10-29T08:00:00Z", true), true);

  // Photo from today (same year) -> NOT an "On This Day" past memory
  assert.equal(isOnThisDay("2026-10-29", "2026-10-29", true), false);

  // Photo from different day
  assert.equal(isOnThisDay("2024-10-28", "2026-10-29", true), false);

  // STRICT POLICY: Unknown capture date must NEVER be matched to On This Day
  assert.equal(isOnThisDay("2024-10-29", "2026-10-29", false), false);
  assert.equal(isOnThisDay("", "2026-10-29", false), false);
});

test("Birthday Dates Engine: groupPhotosByCaptureYear", () => {
  const samplePhotos: PhotoAsset[] = [
    {
      id: "p1",
      storagePath: "photos/1.jpg",
      url: "https://example.com/1.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2023-05-12",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-20",
    },
    {
      id: "p2",
      storagePath: "photos/2.jpg",
      url: "https://example.com/2.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2023-08-20",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-20",
    },
    {
      id: "p3",
      storagePath: "photos/3.jpg",
      url: "https://example.com/3.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "2024-01-01",
      hasKnownCaptureDate: true,
      uploadTimestamp: "2026-10-20",
    },
    {
      id: "p4",
      storagePath: "photos/4.jpg",
      url: "https://example.com/4.jpg",
      mediaKind: "image",
      effectiveCaptureDate: "",
      hasKnownCaptureDate: false,
      uploadTimestamp: "2026-10-20",
    },
  ];

  const grouped = groupPhotosByCaptureYear(samplePhotos);
  assert.equal(grouped[2023].length, 2);
  assert.equal(grouped[2024].length, 1);
  assert.equal(grouped[0].length, 1); // Unknown capture date
});

test("Birthday Dates Engine: formatEffectiveDate", () => {
  assert.equal(formatEffectiveDate("2024-05-15", true), "May 15, 2024");
  assert.equal(formatEffectiveDate("2024-05-15", false), "Date unknown");
  assert.equal(formatEffectiveDate("", false), "Date unknown");
});
