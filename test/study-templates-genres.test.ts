import test from "node:test";
import assert from "node:assert/strict";
import {
  STUDY_GENRES,
  READING_TEMPLATES,
  STUDY_BOOKS,
  filterBooks,
  getReadingProgressForBook,
  saveReadingProgressForBook,
} from "../src/components/study/study-data.ts";

test("Read & Study: Has exactly 12 curated genres with required properties", () => {
  assert.equal(STUDY_GENRES.length, 12, "Must contain exactly 12 genres");

  const requiredIds = [
    "fiction",
    "romance",
    "mystery-thriller",
    "fantasy",
    "sci-fi",
    "biography",
    "self-development",
    "history-philosophy",
    "manga",
    "anime-inspired",
    "comics-graphic-novels",
    "poetry",
  ];

  for (const id of requiredIds) {
    const found = STUDY_GENRES.find((g) => g.id === id);
    assert.ok(found, `Genre with id '${id}' must exist`);
    assert.ok(found.name.length > 0, `Genre '${id}' must have a name`);
    assert.ok(found.icon.length > 0, `Genre '${id}' must have an icon`);
    assert.ok(found.description.length > 0, `Genre '${id}' must have a description`);
  }
});

test("Read & Study: Has all 8 reading presentation templates", () => {
  assert.equal(READING_TEMPLATES.length, 8, "Must contain exactly 8 reading presentation templates");

  const expectedTemplates = [
    "minimal",
    "romantic-journal",
    "manga-panels",
    "anime-story",
    "graphic-novel",
    "bookshelf",
    "notes-workspace",
    "study-cards",
  ];

  for (const tid of expectedTemplates) {
    const tmpl = READING_TEMPLATES.find((t) => t.id === tid);
    assert.ok(tmpl, `Template '${tid}' must exist`);
    assert.ok(tmpl.name.length > 0, `Template '${tid}' must have a name`);
    assert.ok(tmpl.icon.length > 0, `Template '${tid}' must have an icon`);
  }
});

test("Read & Study: Books contain chapters and cover all genres", () => {
  assert.equal(STUDY_BOOKS.length, 13, "Must contain exactly 13 curated books");

  // Verify at least one book per genre across all 12 genres
  for (const genre of STUDY_GENRES) {
    const books = filterBooks(STUDY_BOOKS, genre.id);
    assert.ok(books.length >= 1, `Must have at least one book for genre '${genre.id}'`);
  }

  // Verify all 13 books have chapters, excerpts, page counts, and metadata
  for (const book of STUDY_BOOKS) {
    assert.ok(book.chapters && book.chapters.length >= 1, `Book ${book.id} must have chapters`);
    assert.ok(book.pageCount > 0, `Book ${book.id} must have pageCount > 0`);
    assert.ok(book.author.length > 0, `Book ${book.id} must have author`);
    assert.ok(book.title.length > 0, `Book ${book.id} must have title`);
    assert.ok(book.ratingRationale.length > 10, `Book ${book.id} must have rationale`);
    assert.ok(book.studyNotes && book.studyNotes.length > 0, `Book ${book.id} must have studyNotes`);
    assert.ok(book.keyQuotes && book.keyQuotes.length > 0, `Book ${book.id} must have keyQuotes`);

    for (const ch of book.chapters!) {
      assert.ok(ch.title.length > 0, `Chapter in ${book.id} must have title`);
      assert.ok(ch.content.length > 40, `Chapter in ${book.id} must have substantial content`);
      assert.ok(ch.quote && ch.quote.length > 0, `Chapter in ${book.id} must have quote`);
      assert.ok(ch.speaker && ch.speaker.length > 0, `Chapter in ${book.id} must have speaker`);
    }
  }
});

test("Read & Study: Progress persistence records bookmarked and chapter index", () => {
  const testBookId = "test-book-reading-progress";
  const updated = saveReadingProgressForBook(testBookId, {
    chapterIndex: 2,
    percentRead: 75,
    isBookmarked: true,
    notes: ["Cherished quote from page 42"],
  });

  assert.equal(updated.chapterIndex, 2);
  assert.equal(updated.percentRead, 75);
  assert.equal(updated.isBookmarked, true);
  assert.deepEqual(updated.notes, ["Cherished quote from page 42"]);
});

test("Read & Study: StudyPanel source implements Continue Reading, Chapter Picker, and Font Sizing", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const panelPath = path.resolve(process.cwd(), "src/components/study/StudyPanel.tsx");
  const source = fs.readFileSync(panelPath, "utf-8");

  // Continue Reading requirements
  assert.ok(source.includes("study-continue-section"), "Must include study-continue-section");
  assert.ok(source.includes("Continue Reading"), "Must include Continue Reading banner text");
  assert.ok(source.includes("Resume Reading"), "Must include Resume Reading button text");
  assert.ok(source.includes("recentProgress.book.title"), "Must display real book title");
  assert.ok(source.includes("percentRead"), "Must display percentage progress");

  // Chapter Picker requirements
  assert.ok(source.includes("study-chapter-select"), "Must have chapter picker select dropdown");
  assert.ok(source.includes("handleSelectChapter"), "Must have handleSelectChapter function");

  // Font Sizing requirements
  assert.ok(source.includes("study-font-controls"), "Must have font controls container");
  assert.ok(source.includes("reader-font-"), "Must apply font size to viewport");
  assert.ok(source.includes("setReaderFontSize"), "Must allow changing font size");
});
