import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const WORKSPACE_ROOT = process.cwd();
const LANDING_DIR = path.resolve(WORKSPACE_ROOT, "src/components/landing");

/**
 * Transpiler & Dynamic Component Loader
 * Strips CSS imports so TSX components can be loaded and tested in Node.js
 */
function loadTsxModule(relativePath: string) {
  const filePath = path.resolve(WORKSPACE_ROOT, relativePath);
  assert.ok(fs.existsSync(filePath), `File must exist at ${relativePath}`);

  const rawCode = fs.readFileSync(filePath, "utf-8");
  const cleanedCode = rawCode.replace(/import\s+['"][^'"]+\.css['"];?/g, "");
  const transpiled = ts.transpileModule(cleanedCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });

  const moduleExports: any = {};
  const localRequire = (id: string) => {
    if (id.startsWith("./") || id.startsWith("../")) {
      const target = path.resolve(path.dirname(filePath), id);
      const possibleExtensions = [".ts", ".tsx", ".js", ".jsx", ""];
      for (const ext of possibleExtensions) {
        const full = target + ext;
        if (fs.existsSync(full) && !fs.statSync(full).isDirectory()) {
          return loadTsxModule(path.relative(WORKSPACE_ROOT, full)).moduleExports;
        }
      }
    }
    return require(id);
  };

  const evalFunc = new Function("exports", "require", transpiled.outputText);
  evalFunc(moduleExports, localRequire);

  return { moduleExports, rawCode, filePath };
}

// Load modules dynamically
const dailyReflectionsMod = loadTsxModule("src/components/landing/DailyReflections.tsx").moduleExports;
const personalRemindersMod = loadTsxModule("src/components/landing/PersonalReminders.tsx").moduleExports;

const {
  AUTHENTIC_QURANIC_REFLECTIONS,
  getReflectionForDate,
  getReflectionByIndex,
} = dailyReflectionsMod;

const {
  DEFAULT_STORAGE_KEY,
  DEFAULT_STARTER_REMINDERS,
  formatReminderBadge,
  createReminder,
  updateReminder,
  deleteReminder,
  toggleReminder,
  sortRemindersByDate,
  loadStoredReminders,
  saveStoredReminders,
} = personalRemindersMod;

// ============================================================================
// Suite 1: Daily Reflections & Authentic Quranic Verses Content Integrity
// ============================================================================
describe("Daily Reflections: Authentic Quranic Integrity", () => {
  test("Dataset has at least 8 authentic Quranic reflections", () => {
    assert.ok(Array.isArray(AUTHENTIC_QURANIC_REFLECTIONS));
    assert.ok(
      AUTHENTIC_QURANIC_REFLECTIONS.length >= 8,
      `Expected at least 8 reflections, got ${AUTHENTIC_QURANIC_REFLECTIONS.length}`
    );
  });

  test("Every reflection item conforms to strict Quranic citation structure", () => {
    const arabicRegex = /[\u0600-\u06FF]/;
    const refRegex = /^\d+:\d+(-\d+)?$/;

    for (const item of AUTHENTIC_QURANIC_REFLECTIONS) {
      assert.ok(item.id && typeof item.id === "string", "Item must have non-empty string id");
      assert.ok(item.surah && item.surah.startsWith("Surah "), `Surah name must start with 'Surah ': ${item.surah}`);
      assert.ok(refRegex.test(item.reference), `Reference must follow chapter:verse format: ${item.reference}`);
      assert.ok(
        arabicRegex.test(item.arabic),
        `Arabic text must contain authentic Arabic Unicode characters: ${item.arabic}`
      );
      assert.ok(item.english && item.english.length > 10, `English translation must be substantial: ${item.english}`);
      assert.ok(item.reflection && item.reflection.length > 20, `Reflection must be thoughtful: ${item.reflection}`);
      assert.ok(item.theme && item.theme.length > 0, `Theme must be present: ${item.theme}`);
      assert.ok(
        item.mindfulnessPrompt && item.mindfulnessPrompt.length > 10,
        `Mindfulness prompt must be provided: ${item.mindfulnessPrompt}`
      );
      assert.ok(
        item.dailyAffirmation && item.dailyAffirmation.length > 10,
        `Daily affirmation must be provided: ${item.dailyAffirmation}`
      );
    }
  });

  test("Strict Content Integrity: authentic Surahs and verified references", () => {
    const verifiedSurahs = new Set([
      "Surah Ash-Sharh",
      "Surah Ar-Ra'd",
      "Surah Al-Baqarah",
      "Surah At-Talaq",
      "Surah Ad-Duha",
      "Surah Ibrahim",
      "Surah Ali 'Imran",
    ]);

    for (const item of AUTHENTIC_QURANIC_REFLECTIONS) {
      assert.ok(
        verifiedSurahs.has(item.surah),
        `Surah ${item.surah} must be one of the verified authentic Quranic Surahs`
      );
    }

    // Verify Surah Ash-Sharh ease verse (94:5-6)
    const inshirah = AUTHENTIC_QURANIC_REFLECTIONS.find((r: any) => r.reference === "94:5-6");
    assert.ok(inshirah, "Must contain Surah Ash-Sharh 94:5-6");
    assert.ok(inshirah?.arabic.includes("الْعُسْرِ يُسْرًا"), "Must contain exact Arabic phrase 'الْعُسْرِ يُسْرًا'");
    assert.ok(inshirah?.english.includes("hardship"), "Must contain translation for hardship/ease");

    // Verify Surah Ar-Ra'd heart assurance verse (13:28)
    const rad = AUTHENTIC_QURANIC_REFLECTIONS.find((r: any) => r.reference === "13:28");
    assert.ok(rad, "Must contain Surah Ar-Ra'd 13:28");
    assert.ok(rad?.arabic.includes("تَطْمَئِنُّ الْقُلُوبُ"), "Must contain exact Arabic 'تَطْمَئِنُّ الْقُلُوبُ'");
    assert.ok(rad?.english.includes("hearts are assured"), "Must contain translation for hearts assured");
  });

  test("getReflectionForDate produces deterministic reflections", () => {
    const date1 = new Date(2026, 9, 30); // Oct 30, 2026
    const res1a = getReflectionForDate(date1);
    const res1b = getReflectionForDate(date1);
    assert.equal(res1a.id, res1b.id, "Same date must yield identical reflection");

    const date2 = new Date(2026, 10, 1); // Nov 1, 2026 (2 days later)
    const res2 = getReflectionForDate(date2);
    assert.ok(res2.id, "Reflection for Nov 1 must exist");
  });

  test("getReflectionByIndex handles circular indexing and negative numbers", () => {
    const first = getReflectionByIndex(0);
    const sameFirst = getReflectionByIndex(AUTHENTIC_QURANIC_REFLECTIONS.length);
    assert.equal(first.id, sameFirst.id, "Circular index should wrap around");

    const last = getReflectionByIndex(-1);
    const expectedLast = AUTHENTIC_QURANIC_REFLECTIONS[AUTHENTIC_QURANIC_REFLECTIONS.length - 1];
    assert.equal(last.id, expectedLast.id, "Negative index -1 should yield last reflection");
  });
});

// ============================================================================
// Suite 2: Personal Reminders Management (CRUD, Sorting & Date Badges)
// ============================================================================
describe("Personal Reminders: CRUD & Date Formatting Operations", () => {
  test("createReminder generates valid item with unique id and timestamp", () => {
    const newItem = createReminder({
      title: "Mindful breathing pause",
      dateTime: "2026-11-02T10:00",
      category: "self-care",
      notes: "Take 5 deep breaths in the garden",
      enabled: true,
    });

    assert.ok(newItem.id.startsWith("rem-"));
    assert.equal(newItem.title, "Mindful breathing pause");
    assert.equal(newItem.dateTime, "2026-11-02T10:00");
    assert.equal(newItem.category, "self-care");
    assert.equal(newItem.notes, "Take 5 deep breaths in the garden");
    assert.equal(newItem.enabled, true);
    assert.ok(newItem.createdAt);
  });

  test("updateReminder updates target reminder immutably without altering others", () => {
    const list = [
      {
        id: "r1",
        title: "Morning tea",
        dateTime: "2026-11-01T08:00",
        category: "self-care",
        enabled: true,
        createdAt: "2026-10-30T00:00:00.000Z",
      },
      {
        id: "r2",
        title: "Study Arabic notes",
        dateTime: "2026-11-01T15:00",
        category: "daily",
        enabled: true,
        createdAt: "2026-10-30T00:00:00.000Z",
      },
    ];

    const updated = updateReminder(list, "r2", {
      title: "Study Arabic & Quranic notes",
      category: "reflection",
    });

    assert.equal(updated.length, 2);
    assert.equal(updated[0].title, "Morning tea"); // unchanged
    assert.equal(updated[1].title, "Study Arabic & Quranic notes"); // updated
    assert.equal(updated[1].category, "reflection"); // updated
    assert.equal(list[1].title, "Study Arabic notes"); // original array remains pure
  });

  test("deleteReminder removes reminder by id", () => {
    const list = [
      { id: "r1", title: "A", dateTime: "2026-11-01T08:00", category: "daily", enabled: true, createdAt: "" },
      { id: "r2", title: "B", dateTime: "2026-11-01T09:00", category: "health", enabled: true, createdAt: "" },
      { id: "r3", title: "C", dateTime: "2026-11-01T10:00", category: "self-care", enabled: true, createdAt: "" },
    ];

    const afterDelete = deleteReminder(list, "r2");
    assert.equal(afterDelete.length, 2);
    assert.equal(afterDelete.find((r: any) => r.id === "r2"), undefined);
    assert.equal(afterDelete[0].id, "r1");
    assert.equal(afterDelete[1].id, "r3");
  });

  test("toggleReminder toggles enabled state between active and completed", () => {
    const list = [
      { id: "r1", title: "Hydrate", dateTime: "2026-11-01T11:00", category: "health", enabled: true, createdAt: "" },
    ];

    const toggledOff = toggleReminder(list, "r1");
    assert.equal(toggledOff[0].enabled, false);

    const toggledOn = toggleReminder(toggledOff, "r1");
    assert.equal(toggledOn[0].enabled, true);
  });

  test("sortRemindersByDate sorts reminders chronologically ascending", () => {
    const list = [
      { id: "r1", title: "Evening", dateTime: "2026-11-02T20:00", category: "self-care", enabled: true, createdAt: "" },
      { id: "r2", title: "Morning", dateTime: "2026-11-01T08:00", category: "self-care", enabled: true, createdAt: "" },
      { id: "r3", title: "Afternoon", dateTime: "2026-11-01T14:00", category: "self-care", enabled: true, createdAt: "" },
    ];

    const sorted = sortRemindersByDate(list);
    assert.equal(sorted[0].id, "r2");
    assert.equal(sorted[1].id, "r3");
    assert.equal(sorted[2].id, "r1");
  });

  test("formatReminderBadge accurately tags Today, Tomorrow, Past, and Future dates", () => {
    const referenceDate = new Date("2026-11-01T10:00:00");

    // Today's reminder
    const todayBadge = formatReminderBadge("2026-11-01T14:30:00", referenceDate);
    assert.equal(todayBadge.isToday, true);
    assert.equal(todayBadge.isTomorrow, false);
    assert.ok(todayBadge.label.startsWith("Today · 2:30 PM"));

    // Tomorrow's reminder
    const tomorrowBadge = formatReminderBadge("2026-11-02T09:00:00", referenceDate);
    assert.equal(tomorrowBadge.isTomorrow, true);
    assert.equal(tomorrowBadge.isToday, false);
    assert.ok(tomorrowBadge.label.startsWith("Tomorrow · 9:00 AM"));

    // Past reminder
    const pastBadge = formatReminderBadge("2026-10-30T10:00:00", referenceDate);
    assert.equal(pastBadge.isPast, true);
    assert.ok(pastBadge.label.includes("Oct 30"));

    // Future reminder beyond tomorrow
    const futureBadge = formatReminderBadge("2026-11-15T16:00:00", referenceDate);
    assert.equal(futureBadge.isToday, false);
    assert.equal(futureBadge.isTomorrow, false);
    assert.ok(futureBadge.label.includes("Nov 15"));
  });
});

// ============================================================================
// Suite 3: Persistence and Storage Safety
// ============================================================================
describe("Personal Reminders: Persistence and Storage Safety", () => {
  test("loadStoredReminders falls back to starter reminders when storage is empty", () => {
    const mockStorage = {
      getItem: () => null,
    };
    const loaded = loadStoredReminders("test_key", mockStorage);
    assert.deepEqual(loaded, DEFAULT_STARTER_REMINDERS);
  });

  test("saveStoredReminders and loadStoredReminders round-trip correctly", () => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
    };

    const testReminders = [
      {
        id: "rem-custom",
        title: "Sunset tea with Meerah",
        dateTime: "2026-11-01T17:30",
        category: "special",
        enabled: true,
        createdAt: new Date().toISOString(),
      },
    ];

    saveStoredReminders(testReminders, "meerah_test_key", mockStorage);
    const retrieved = loadStoredReminders("meerah_test_key", mockStorage);

    assert.equal(retrieved.length, 1);
    assert.equal(retrieved[0].id, "rem-custom");
    assert.equal(retrieved[0].title, "Sunset tea with Meerah");
  });

  test("loadStoredReminders gracefully handles corrupted JSON in storage", () => {
    const mockStorage = {
      getItem: () => "{ corrupted json -- not an array }",
    };
    const loaded = loadStoredReminders("test_key", mockStorage);
    assert.deepEqual(loaded, DEFAULT_STARTER_REMINDERS);
  });
});

// ============================================================================
// Suite 4: Component Files, Markup & Accessibility Verification
// ============================================================================
describe("Component Files & Aesthetic Integrity", () => {
  test("DailyReflections.tsx exists and is a client component with accessible RTL Arabic display", () => {
    const filePath = path.join(LANDING_DIR, "DailyReflections.tsx");
    assert.ok(fs.existsSync(filePath), "DailyReflections.tsx must exist");
    const code = fs.readFileSync(filePath, "utf-8");

    assert.ok(code.includes('"use client"'), "Must be client component ('use client')");
    assert.ok(code.includes('lang="ar"'), "Must include lang='ar' for Arabic script");
    assert.ok(code.includes('dir="rtl"'), "Must include dir='rtl' for Arabic text direction");
    assert.ok(code.includes('data-testid="daily-reflections-section"'), "Must have data-testid");
    assert.ok(code.includes("AUTHENTIC_QURANIC_REFLECTIONS"), "Must export authentic reflections array");
    assert.ok(code.includes("aria-label"), "Must include accessible aria-label attributes");
  });

  test("PersonalReminders.tsx exists and is a client component with accessible form and filter bar", () => {
    const filePath = path.join(LANDING_DIR, "PersonalReminders.tsx");
    assert.ok(fs.existsSync(filePath), "PersonalReminders.tsx must exist");
    const code = fs.readFileSync(filePath, "utf-8");

    assert.ok(code.includes('"use client"'), "Must be client component ('use client')");
    assert.ok(code.includes('data-testid="personal-reminders-section"'), "Must have data-testid");
    assert.ok(code.includes('htmlFor="reminder-title-input"'), "Must provide accessible label htmlFor association");
    assert.ok(code.includes('role="tablist"'), "Filter bar must have accessible role='tablist'");
    assert.ok(code.includes("DEFAULT_STARTER_REMINDERS"), "Must export default starter reminders");
    assert.ok(code.includes("localStorage"), "Must reference localStorage for persistence");
  });

  test("daily-reflections.css and personal-reminders.css adhere to design tokens and accessibility", () => {
    const reflectionsCss = fs.readFileSync(path.join(LANDING_DIR, "daily-reflections.css"), "utf-8");
    const remindersCss = fs.readFileSync(path.join(LANDING_DIR, "personal-reminders.css"), "utf-8");

    // Imports tokens
    assert.ok(reflectionsCss.includes('@import "./landing-tokens.css";'));
    assert.ok(remindersCss.includes('@import "./landing-tokens.css";'));

    // Motion sensitivity
    assert.ok(
      reflectionsCss.includes("@media (prefers-reduced-motion: reduce)"),
      "daily-reflections.css must support prefers-reduced-motion"
    );
    assert.ok(
      remindersCss.includes("@media (prefers-reduced-motion: reduce)"),
      "personal-reminders.css must support prefers-reduced-motion"
    );

    // Focus visible outlines
    assert.ok(reflectionsCss.includes(":focus-visible"), "daily-reflections.css must define focus-visible");
    assert.ok(remindersCss.includes(":focus-visible"), "personal-reminders.css must define focus-visible");

    // Responsive design rules
    assert.ok(reflectionsCss.includes("@media (max-width: 820px)"));
    assert.ok(reflectionsCss.includes("@media (max-width: 480px)"));
    assert.ok(remindersCss.includes("@media (max-width: 820px)"));
    assert.ok(remindersCss.includes("@media (max-width: 480px)"));
  });

  test("Central landing barrel (index.ts) exports DailyReflections and PersonalReminders", () => {
    const indexPath = path.join(LANDING_DIR, "index.ts");
    const code = fs.readFileSync(indexPath, "utf-8");

    assert.ok(code.includes("DailyReflections"), "index.ts must export DailyReflections");
    assert.ok(code.includes("AUTHENTIC_QURANIC_REFLECTIONS"), "index.ts must export AUTHENTIC_QURANIC_REFLECTIONS");
    assert.ok(code.includes("PersonalReminders"), "index.ts must export PersonalReminders");
    assert.ok(code.includes("createReminder"), "index.ts must export createReminder");
    assert.ok(code.includes("formatReminderBadge"), "index.ts must export formatReminderBadge");
  });

  test("Experience.tsx wires DailyReflections and PersonalReminders directly into Everyday Home", () => {
    const expPath = path.resolve(process.cwd(), "src/components/Experience.tsx");
    const code = fs.readFileSync(expPath, "utf-8");

    assert.ok(code.includes("<DailyReflections"), "Experience.tsx must render <DailyReflections />");
    assert.ok(code.includes("<PersonalReminders"), "Experience.tsx must render <PersonalReminders />");
    assert.ok(code.includes("section-daily-reflections"), "Must provide anchor id section-daily-reflections");
    assert.ok(code.includes("section-personal-reminders"), "Must provide anchor id section-personal-reminders");
  });
});
