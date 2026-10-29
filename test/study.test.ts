import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import type { Book, Genre } from "../src/components/study/study-data.ts";
import {
  STUDY_GENRES,
  STUDY_BOOKS,
  filterBooks,
  getCuratedRecommendations,
  getGenreById,
  getBooksByGenre,
  searchBooks,
  resolveReadingSourceDisplay,
  getGenreCounts,
} from "../src/components/study/study-data.ts";

// ============================================================================
// Test Suite 1: Data Model & Catalog Integrity
// ============================================================================

test("Data Integrity: contains at least 12 curated genres", () => {
  assert.ok(STUDY_GENRES.length >= 12, `Expected at least 12 genres, found ${STUDY_GENRES.length}`);

  const requiredGenres = [
    "Fiction",
    "Romance",
    "Mystery & Thriller",
    "Fantasy",
    "Sci-Fi",
    "Biography",
    "Self-Development",
    "History & Philosophy",
    "Manga",
    "Anime-Inspired Stories",
    "Comics/Graphic Novels",
    "Poetry",
  ];

  for (const genreName of requiredGenres) {
    const found = STUDY_GENRES.some((g) => g.name === genreName);
    assert.ok(found, `Required genre "${genreName}" must be present in STUDY_GENRES`);
  }
});

test("Data Integrity: each genre has required properties", () => {
  for (const genre of STUDY_GENRES) {
    assert.ok(genre.id && typeof genre.id === "string", `Genre ${genre.id} must have valid id`);
    assert.ok(genre.name && typeof genre.name === "string", `Genre ${genre.id} must have valid name`);
    assert.ok(genre.icon && typeof genre.icon === "string", `Genre ${genre.id} must have valid icon`);
    assert.ok(
      genre.description && typeof genre.description === "string",
      `Genre ${genre.id} must have valid description`
    );
  }
});

test("Data Integrity: catalog contains at least 12 curated books", () => {
  assert.ok(
    STUDY_BOOKS.length >= 12,
    `Expected at least 12 books, found ${STUDY_BOOKS.length}`
  );
});

test("Data Integrity: each book has all required fields with valid types", () => {
  const genreIds = new Set(STUDY_GENRES.map((g) => g.id));

  for (const book of STUDY_BOOKS) {
    assert.ok(book.id && typeof book.id === "string", `Book must have id: ${JSON.stringify(book)}`);
    assert.ok(book.title && typeof book.title === "string", `Book ${book.id} must have title`);
    assert.ok(book.author && typeof book.author === "string", `Book ${book.id} must have author`);
    assert.ok(genreIds.has(book.genreId), `Book ${book.id} has invalid genreId: ${book.genreId}`);
    assert.ok(book.description && book.description.trim().length > 10, `Book ${book.id} must have description`);
    assert.ok(book.coverColor && typeof book.coverColor === "string", `Book ${book.id} must have coverColor`);
    assert.ok(book.coverAccent && typeof book.coverAccent === "string", `Book ${book.id} must have coverAccent`);
    assert.ok(book.coverSymbol && typeof book.coverSymbol === "string", `Book ${book.id} must have coverSymbol`);
    assert.ok(typeof book.pageCount === "number" && book.pageCount > 0, `Book ${book.id} must have pageCount > 0`);
    assert.ok(
      book.ratingRationale && book.ratingRationale.trim().length > 10,
      `Book ${book.id} must have warm ratingRationale`
    );
  }
});

test("Data Integrity: covers are represented across all genres", () => {
  for (const genre of STUDY_GENRES) {
    const booksInGenre = STUDY_BOOKS.filter((b) => b.genreId === genre.id);
    assert.ok(booksInGenre.length >= 1, `Genre "${genre.name}" (${genre.id}) must have at least 1 book`);
  }
});

// ============================================================================
// Test Suite 2: Curated Recommendations
// ============================================================================

test("Recommendations: at least 3 featured books are curated with editorial rationales", () => {
  const recommendations = getCuratedRecommendations(STUDY_BOOKS);
  assert.ok(
    recommendations.length >= 3,
    `Expected at least 3 recommendations, found ${recommendations.length}`
  );

  for (const book of recommendations) {
    assert.equal(book.isFeatured, true);
    assert.ok(
      book.ratingRationale && book.ratingRationale.length > 20,
      `Recommendation ${book.title} must have a rich warm editorial rationale`
    );
  }
});

test("Recommendations: defaults to STUDY_BOOKS when called without args", () => {
  const recommendations = getCuratedRecommendations();
  assert.ok(recommendations.length >= 3);
});

// ============================================================================
// Test Suite 3: Genre Filtering & Query Logic
// ============================================================================

test("Filtering: filters books by specific genre ID", () => {
  const poetryBooks = filterBooks(STUDY_BOOKS, "poetry");
  assert.ok(poetryBooks.length >= 2, "Expected at least 2 Poetry books");
  assert.ok(poetryBooks.every((b) => b.genreId === "poetry"));

  const mysteryBooks = filterBooks(STUDY_BOOKS, "mystery-thriller");
  assert.ok(mysteryBooks.length >= 1, "Expected at least 1 mystery book");
  assert.ok(mysteryBooks.every((b) => b.genreId === "mystery-thriller"));
});

test("Filtering: returns all books when genreId is 'all', null, or undefined", () => {
  const all1 = filterBooks(STUDY_BOOKS, "all");
  assert.equal(all1.length, STUDY_BOOKS.length);

  const all2 = filterBooks(STUDY_BOOKS, null);
  assert.equal(all2.length, STUDY_BOOKS.length);

  const all3 = filterBooks(STUDY_BOOKS, undefined);
  assert.equal(all3.length, STUDY_BOOKS.length);
});

test("Filtering: getBooksByGenre returns correct subset", () => {
  const litBooks = getBooksByGenre(STUDY_BOOKS, "fiction");
  assert.ok(litBooks.length >= 1);
  assert.ok(litBooks.every((b) => b.genreId === "fiction"));
});

test("Filtering: getGenreById finds matching genre or undefined", () => {
  const found = getGenreById("sci-fi");
  assert.ok(found);
  assert.equal(found.name, "Sci-Fi");

  const notFound = getGenreById("non-existent-genre");
  assert.equal(notFound, undefined);
});

// ============================================================================
// Test Suite 4: Search & Case-Insensitive Matching
// ============================================================================

test("Search: finds books by author name", () => {
  const results = searchBooks(STUDY_BOOKS, "Jane Austen");
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Pride and Prejudice");

  const resultsLower = searchBooks(STUDY_BOOKS, "jane austen");
  assert.equal(resultsLower.length, 1);
  assert.equal(resultsLower[0].title, "Pride and Prejudice");
});

test("Search: finds books by title query", () => {
  const results = searchBooks(STUDY_BOOKS, "Little Prince");
  assert.equal(results.length, 1);
  assert.equal(results[0].author, "Antoine de Saint-Exupéry");
});

test("Search: finds books by Urdu script", () => {
  const results = searchBooks(STUDY_BOOKS, "اقبال");
  assert.ok(results.length >= 1, "Should find Iqbal book via Urdu text");
  assert.ok(results.some((b) => b.title.includes("Iqbal")));
});

test("Search: finds books by keyword in description or tags", () => {
  const results = searchBooks(STUDY_BOOKS, "Poirot");
  assert.equal(results.length, 1);
  assert.equal(results[0].id, "book-roger-ackroyd");
});

test("Search: returns empty array for non-matching search term", () => {
  const results = searchBooks(STUDY_BOOKS, "xyz_non_existent_text_12345");
  assert.equal(results.length, 0);
});

test("Search & Filter combined: respects both genre and search term simultaneously", () => {
  // Should match "Pride and Prejudice" in romance
  const matched = filterBooks(STUDY_BOOKS, "romance", "Pride");
  assert.equal(matched.length, 1);

  // Searching "Pride" inside poetry should return 0
  const mismatched = filterBooks(STUDY_BOOKS, "poetry", "Pride");
  assert.equal(mismatched.length, 0);
});

// ============================================================================
// Test Suite 5: Reading Source Display & Fallback
// ============================================================================

test("Reading Source: returns external link display when readingSource URL is present", () => {
  const bookWithLink = STUDY_BOOKS.find((b) => b.readingSource);
  assert.ok(bookWithLink, "At least one book must have readingSource URL");

  const display = resolveReadingSourceDisplay(bookWithLink);
  assert.equal(display.type, "external");
  assert.ok(display.url && display.url.startsWith("http"));
  assert.ok(display.label.includes("Online Excerpt") || display.label.includes("Digital Edition"));
});

test("Reading Source: returns honest Physical Edition fallback when readingSource is missing", () => {
  const bookWithoutLink = STUDY_BOOKS.find((b) => !b.readingSource);
  assert.ok(bookWithoutLink, "At least one book must test physical library fallback");

  const display = resolveReadingSourceDisplay(bookWithoutLink);
  assert.equal(display.type, "physical");
  assert.equal(display.url, undefined);
  assert.ok(display.label.includes("Physical Edition"));
  assert.ok(display.label.includes("Personal Library"));
  assert.ok(display.note.length > 10);
});

// ============================================================================
// Test Suite 6: Genre Counts Aggregation
// ============================================================================

test("Genre Counts: accurately calculates counts for each genre and total", () => {
  const counts = getGenreCounts(STUDY_BOOKS);
  assert.equal(counts["all"], STUDY_BOOKS.length);

  let sum = 0;
  for (const genre of STUDY_GENRES) {
    const count = counts[genre.id] || 0;
    assert.ok(count >= 1, `Genre ${genre.id} must have count >= 1`);
    sum += count;
  }
  assert.equal(sum, STUDY_BOOKS.length);
});

// ============================================================================
// Test Suite 7: Source Code & Presentation Verification (StudyPanel.tsx)
// ============================================================================

const studyPanelPath = path.resolve(
  process.cwd(),
  "src/components/study/StudyPanel.tsx"
);

test("Component source: StudyPanel.tsx exists and exports StudyPanel component", () => {
  assert.ok(fs.existsSync(studyPanelPath), "StudyPanel.tsx must exist");
  const source = fs.readFileSync(studyPanelPath, "utf-8");

  assert.ok(source.includes("export function StudyPanel"), "Must export StudyPanel component");
  assert.ok(source.includes("export interface StudyPanelProps"), "Must export StudyPanelProps");
  assert.ok(source.includes("export default StudyPanel"), "Must default export StudyPanel");
});

test("Component source: renders welcoming header with Playfair title and Urdu kicker", () => {
  const source = fs.readFileSync(studyPanelPath, "utf-8");
  assert.ok(
    source.includes("Curated Bookshelf · مطالعہ اور سکون"),
    "Header must have kicker with Urdu blessing"
  );
  assert.ok(
    source.includes("Read &amp; Study") || source.includes("Read & Study"),
    "Header must have title 'Read & Study'"
  );
  assert.ok(
    source.includes("recipientName"),
    "Subtitle must include recipientName"
  );
});

test("Component source: implements detail modal with dialog role, focus, and escape listener", () => {
  const source = fs.readFileSync(studyPanelPath, "utf-8");
  assert.ok(source.includes('role="dialog"'), "Modal must have role='dialog'");
  assert.ok(source.includes('aria-modal="true"'), "Modal must have aria-modal='true'");
  assert.ok(source.includes('aria-labelledby="study-modal-title"'), "Modal must have aria-labelledby");
  assert.ok(source.includes('aria-label="Close book details"'), "Modal must have close button aria-label");
  assert.ok(source.includes('"Escape"'), "Modal must handle Escape key listener");
});

test("Component source: supports interactive 'Read Preview Excerpt' tab", () => {
  const source = fs.readFileSync(studyPanelPath, "utf-8");
  assert.ok(source.includes("Read Preview Excerpt"), "Must have tab for Read Preview Excerpt");
  assert.ok(source.includes("About Book"), "Must have tab for About Book");
  assert.ok(source.includes("study-excerpt-reader"), "Must have excerpt reader container");
});

// ============================================================================
// Test Suite 8: CSS Design System & Token Verification (study.css)
// ============================================================================

const studyCssPath = path.resolve(
  process.cwd(),
  "src/components/study/study.css"
);

test("CSS verification: study.css exists and uses design system tokens", () => {
  assert.ok(fs.existsSync(studyCssPath), "study.css must exist");
  const css = fs.readFileSync(studyCssPath, "utf-8");

  assert.ok(css.includes("--sb-bg-ivory"), "Must declare/use --sb-bg-ivory");
  assert.ok(css.includes("--sb-accent-rose"), "Must declare/use --sb-accent-rose");
  assert.ok(css.includes("--sb-accent-sunflower"), "Must declare/use --sb-accent-sunflower");
  assert.ok(css.includes("--sb-accent-sage"), "Must declare/use --sb-accent-sage");
  assert.ok(css.includes("--sb-text-primary"), "Must declare/use --sb-text-primary");
  assert.ok(css.includes("--sb-card-white"), "Must declare/use --sb-card-white");
});

test("CSS verification: includes 3D book details, spine crease, bookmark ribbon, hover lift", () => {
  const css = fs.readFileSync(studyCssPath, "utf-8");

  assert.ok(css.includes(".study-book-card"), "Must style book cards");
  assert.ok(css.includes(".study-book-cover"), "Must style book cover");
  assert.ok(css.includes(".study-bookmark-ribbon"), "Must include bookmark ribbon");
  assert.ok(css.includes("translateY"), "Must support 3D hover lift transition");
});

test("CSS verification: supports prefers-reduced-motion and high contrast focus-visible", () => {
  const css = fs.readFileSync(studyCssPath, "utf-8");

  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "Must include @media (prefers-reduced-motion: reduce)"
  );
  assert.ok(
    css.includes(":focus-visible"),
    "Must include high-contrast :focus-visible rules"
  );
});
