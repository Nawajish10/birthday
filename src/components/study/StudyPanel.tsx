"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import "./study.css";
import {
  Book,
  Chapter,
  ReadingTemplateId,
  READING_TEMPLATES,
  STUDY_GENRES,
  STUDY_BOOKS,
  filterBooks,
  getCuratedRecommendations,
  getGenreCounts,
  resolveReadingSourceDisplay,
  getReadingProgressForBook,
  saveReadingProgressForBook,
  loadAllReadingProgress,
  ReadingProgressRecord,
} from "./study-data";

export interface StudyPanelProps {
  initialBooks?: Book[];
  initialGenre?: string;
  recipientName?: string;
  onOpenBook?: (book: Book) => void;
  className?: string;
}

export function StudyPanel({
  initialBooks = STUDY_BOOKS,
  initialGenre = "all",
  recipientName = "Meerah",
  onOpenBook,
  className = "",
}: StudyPanelProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "reader">("about");
  const [selectedTemplate, setSelectedTemplate] = useState<ReadingTemplateId>("romantic-journal");
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "md" | "lg">("md");

  // Reader progression state for active book
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [userNotes, setUserNotes] = useState<string[]>([]);
  const [studyCardIndex, setStudyCardIndex] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  // Filtered books based on genre and search
  const filteredBooks = useMemo(() => {
    return filterBooks(initialBooks, selectedGenre, searchQuery);
  }, [initialBooks, selectedGenre, searchQuery]);

  // Curated recommendations (featured books)
  const recommendations = useMemo(() => {
    return getCuratedRecommendations(initialBooks);
  }, [initialBooks]);

  // Compute counts per genre
  const genreCounts = useMemo(() => {
    return getGenreCounts(initialBooks);
  }, [initialBooks]);

  const getMostRecentProgress = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      const all = loadAllReadingProgress();
      const entries = Object.values(all).filter(
        (p) => (p.percentRead && p.percentRead > 0) || (p.chapterIndex && p.chapterIndex > 0) || p.isBookmarked
      );
      if (entries.length > 0) {
        entries.sort(
          (a, b) => new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()
        );
        const mostRecent = entries[0];
        const matchedBook = initialBooks.find((b) => b.id === mostRecent.bookId);
        if (matchedBook) {
          return { book: matchedBook, progress: mostRecent };
        }
      }
    } catch {}
    return null;
  }, [initialBooks]);

  // Track most recent active reading progress for "Continue Reading" banner
  const [recentProgress, setRecentProgress] = useState<{
    book: Book;
    progress: ReadingProgressRecord;
  } | null>(() => getMostRecentProgress());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = () => {
      setRecentProgress(getMostRecentProgress());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [getMostRecentProgress]);

  const refreshProgress = useCallback(() => {
    setRecentProgress(getMostRecentProgress());
  }, [getMostRecentProgress]);

  // Handle book modal open & sync saved reading progress
  const handleOpenBook = useCallback(
    (book: Book, openReader = false) => {
      setActiveBook(book);
      setActiveTab(openReader ? "reader" : "about");

      // Load persisted progress
      const progress = getReadingProgressForBook(book.id);
      setCurrentChapterIndex(progress.chapterIndex || 0);
      setIsBookmarked(Boolean(progress.isBookmarked));
      setUserNotes(progress.notes || []);
      setStudyCardIndex(0);
      setIsCardFlipped(false);

      if (onOpenBook) {
        onOpenBook(book);
      }
    },
    [onOpenBook]
  );

  // Close modal
  const handleCloseModal = useCallback(() => {
    setActiveBook(null);
  }, []);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && activeBook) {
        handleCloseModal();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBook, handleCloseModal]);

  // Chapters helper for active book
  const bookChapters: Chapter[] = useMemo(() => {
    if (!activeBook) return [];
    if (activeBook.chapters && activeBook.chapters.length > 0) {
      return activeBook.chapters;
    }
    return [
      {
        id: `${activeBook.id}-ch1`,
        title: "Selected Excerpt",
        content:
          activeBook.sampleExcerpt ||
          activeBook.description ||
          "A quiet, thoughtful passage waiting to be shared.",
        quote: activeBook.keyQuotes?.[0],
        speaker: activeBook.author,
      },
    ];
  }, [activeBook]);

  const activeChapter: Chapter = useMemo(() => {
    if (bookChapters.length === 0) {
      return {
        id: "default-ch",
        title: "Reading",
        content: "Quiet reading passage.",
      };
    }
    return bookChapters[Math.min(currentChapterIndex, bookChapters.length - 1)];
  }, [bookChapters, currentChapterIndex]);

  // Chapter progression handlers
  const handleSelectChapter = useCallback(
    (index: number) => {
      if (!activeBook) return;
      const clamped = Math.max(0, Math.min(index, bookChapters.length - 1));
      setCurrentChapterIndex(clamped);
      const percent = Math.round(((clamped + 1) / bookChapters.length) * 100);
      saveReadingProgressForBook(activeBook.id, {
        chapterIndex: clamped,
        percentRead: percent,
      });
      refreshProgress();
    },
    [activeBook, bookChapters.length, refreshProgress]
  );

  const handleNextChapter = useCallback(() => {
    if (!activeBook) return;
    if (currentChapterIndex < bookChapters.length - 1) {
      const nextIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIdx);
      const percent = Math.round(((nextIdx + 1) / bookChapters.length) * 100);
      saveReadingProgressForBook(activeBook.id, {
        chapterIndex: nextIdx,
        percentRead: percent,
      });
      refreshProgress();
    }
  }, [activeBook, currentChapterIndex, bookChapters.length, refreshProgress]);

  const handlePrevChapter = useCallback(() => {
    if (!activeBook) return;
    if (currentChapterIndex > 0) {
      const prevIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(prevIdx);
      const percent = Math.round(((prevIdx + 1) / bookChapters.length) * 100);
      saveReadingProgressForBook(activeBook.id, {
        chapterIndex: prevIdx,
        percentRead: percent,
      });
      refreshProgress();
    }
  }, [activeBook, currentChapterIndex, bookChapters.length, refreshProgress]);

  // Toggle bookmark handler
  const handleToggleBookmark = useCallback(() => {
    if (!activeBook) return;
    const nextVal = !isBookmarked;
    setIsBookmarked(nextVal);
    saveReadingProgressForBook(activeBook.id, { isBookmarked: nextVal });
    refreshProgress();
  }, [activeBook, isBookmarked, refreshProgress]);

  // Add study note handler
  const handleAddNote = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeBook || !newNoteText.trim()) return;
      const updatedNotes = [...userNotes, newNoteText.trim()];
      setUserNotes(updatedNotes);
      setNewNoteText("");
      saveReadingProgressForBook(activeBook.id, { notes: updatedNotes });
      refreshProgress();
    },
    [activeBook, newNoteText, userNotes, refreshProgress]
  );

  return (
    <div className={`study-container ${className}`.trim()}>
      {/* ================================================================== */}
      {/* Welcoming Header */}
      {/* ================================================================== */}
      <header className="study-header">
        <div className="study-kicker">
          <span aria-hidden="true">📖</span>
          <span>Curated Bookshelf · مطالعہ اور سکون</span>
        </div>
        <h1 className="study-title">Read &amp; Study</h1>
        <p className="study-subtitle">
          A quiet, cozy sanctuary of cherished books, timeless poetry, and contemplative prose,
          thoughtfully handpicked for {recipientName}’s gentle afternoons and reflective evenings.
        </p>
      </header>

      {/* ================================================================== */}
      {/* Continue Reading Card (if active reading progress exists) */}
      {/* ================================================================== */}
      {recentProgress && !searchQuery && (
        <section className="study-continue-section" aria-label="Continue reading">
          <div className="study-continue-card">
            <div className="study-continue-left">
              <span className="study-continue-badge">🔖 Continue Reading · جاری رکھیں</span>
              <h3 className="study-continue-title">{recentProgress.book.title}</h3>
              <p className="study-continue-meta">
                {recentProgress.book.author} · Chapter {(recentProgress.progress.chapterIndex || 0) + 1}
              </p>
              <div className="study-continue-bar-wrap">
                <div
                  className="study-continue-bar"
                  style={{ width: `${Math.max(recentProgress.progress.percentRead || 10, 10)}%` }}
                />
              </div>
              <span className="study-continue-percent">
                {recentProgress.progress.percentRead || 10}% completed
              </span>
            </div>
            <button
              type="button"
              className="study-continue-resume-btn"
              onClick={() => handleOpenBook(recentProgress.book, true)}
              aria-label={`Resume reading ${recentProgress.book.title}`}
            >
              <span>Resume Reading</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* Curated Recommendations Highlights */}
      {/* ================================================================== */}
      {recommendations.length > 0 && selectedGenre === "all" && !searchQuery && (
        <section
          className="study-recommendations-section"
          aria-labelledby="study-recommendations-heading"
        >
          <div className="study-recommendations-header">
            <h2 id="study-recommendations-heading" className="study-recommendations-title">
              <span aria-hidden="true">✨</span>
              <span>Curator&apos;s Highlights · خاص انتخاب</span>
            </h2>
            <span className="study-recommendations-badge">Handpicked for You</span>
          </div>

          <div className="study-recommendations-grid">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="study-rec-card"
                role="button"
                tabIndex={0}
                onClick={() => handleOpenBook(rec)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenBook(rec);
                  }
                }}
                aria-label={`Open details for recommended book ${rec.title}`}
              >
                <div>
                  <div className="study-rec-ribbon">
                    <span aria-hidden="true">★</span> Curated Pick
                  </div>
                  <h3 className="study-rec-card-title">{rec.title}</h3>
                  <div className="study-rec-card-author">{rec.author}</div>
                  <div className="study-rec-card-rationale">
                    &ldquo;{rec.ratingRationale}&rdquo;
                  </div>
                </div>
                <button
                  type="button"
                  className="study-rec-inspect-btn"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <span>Inspect Book &amp; Reader</span>
                  <span aria-hidden="true">&rarr;</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* Search & Genre Filter Bar (12 Canonical Genres) */}
      {/* ================================================================== */}
      <section className="study-controls" aria-label="Book catalog filters">
        {/* Search Input */}
        <div className="study-search-bar">
          <span className="study-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="study-search-input"
            placeholder="Search by title, author, keyword, or Urdu verse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search bookshelf"
          />
          {searchQuery && (
            <button
              type="button"
              className="study-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search input"
            >
              ✕
            </button>
          )}
        </div>

        {/* 12-Genre Pill Bar */}
        <div className="study-genre-bar" role="tablist" aria-label="Filter by genre">
          <button
            type="button"
            role="tab"
            aria-selected={selectedGenre === "all"}
            className={`study-genre-pill ${selectedGenre === "all" ? "is-active" : ""}`}
            onClick={() => setSelectedGenre("all")}
          >
            <span>📚</span>
            <span>All Genres</span>
            <span className="study-genre-pill-count">{genreCounts["all"] || 0}</span>
          </button>

          {STUDY_GENRES.map((genre) => {
            const count = genreCounts[genre.id] || 0;
            const isActive = selectedGenre === genre.id;
            return (
              <button
                key={genre.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`study-genre-pill ${isActive ? "is-active" : ""}`}
                onClick={() => setSelectedGenre(genre.id)}
              >
                <span aria-hidden="true">{genre.icon}</span>
                <span>{genre.name}</span>
                <span className="study-genre-pill-count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ================================================================== */}
      {/* Bookshelf Grid */}
      {/* ================================================================== */}
      {filteredBooks.length > 0 ? (
        <section className="study-shelf-grid" aria-label="Bookshelf grid">
          {filteredBooks.map((book) => {
            const genre = STUDY_GENRES.find((g) => g.id === book.genreId);
            return (
              <article
                key={book.id}
                className="study-book-card"
                role="button"
                tabIndex={0}
                onClick={() => handleOpenBook(book)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleOpenBook(book);
                  }
                }}
                aria-label={`View details for ${book.title} by ${book.author}`}
              >
                {/* Book Cover Visual with Paper & Spine Styling */}
                <div
                  className="study-book-cover"
                  style={{
                    backgroundColor: book.coverColor,
                    borderColor: book.coverAccent,
                  }}
                >
                  <div className="study-bookmark-ribbon" aria-hidden="true" />
                  <div className="study-cover-top">
                    <span className="study-cover-symbol" aria-hidden="true">
                      {book.coverSymbol}
                    </span>
                    <h3 className="study-cover-title">{book.title}</h3>
                    <div className="study-cover-author">{book.author}</div>
                  </div>
                  <div className="study-cover-bottom">
                    <span className="study-cover-badge">{genre?.name || "Book"}</span>
                    <span className="study-cover-pages">{book.pageCount} p.</span>
                  </div>
                </div>

                {/* Card Meta & Synopsis */}
                <div className="study-book-meta">
                  <div className="study-book-meta-header">
                    <h4 className="study-book-card-title">{book.title}</h4>
                    <p className="study-book-card-author">{book.author}</p>
                  </div>
                  <p className="study-book-synopsis">{book.description}</p>
                  <div className="study-book-card-footer">
                    <span className="study-book-tag">
                      {genre?.icon} {genre?.name}
                    </span>
                    <span className="study-book-cta">Open Reader &rarr;</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="study-empty-state">
          <div className="study-empty-icon" aria-hidden="true">
            🔍
          </div>
          <h3 className="study-empty-title">No books found</h3>
          <p className="study-empty-desc">
            We couldn&apos;t find any books matching &ldquo;{searchQuery}&rdquo; in this genre.
          </p>
          <button
            type="button"
            className="study-empty-btn"
            onClick={() => {
              setSearchQuery("");
              setSelectedGenre("all");
            }}
          >
            Clear Filters &amp; Reset
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* Book Detail & Interactive Multi-Template Reader Modal */}
      {/* ================================================================== */}
      {activeBook && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={handleCloseModal}
        >
          <div
            className="study-modal-content study-modal-enhanced"
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="study-modal-header">
              <div className="study-modal-header-info">
                <span className="study-modal-genre-tag">
                  {STUDY_GENRES.find((g) => g.id === activeBook.genreId)?.icon}{" "}
                  {STUDY_GENRES.find((g) => g.id === activeBook.genreId)?.name}
                </span>
                <span className="study-modal-reading-time">
                  📖 {Math.max(5, Math.round(activeBook.pageCount * 1.4))} min read
                </span>
              </div>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close book details"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="study-modal-body">
              {/* Left Column: Book Cover Presentation & Actions */}
              <div className="study-modal-left">
                <div className="study-modal-cover-wrap">
                  <div
                    className="study-book-cover"
                    style={{
                      backgroundColor: activeBook.coverColor,
                      borderColor: activeBook.coverAccent,
                    }}
                  >
                    <div
                      className={`study-bookmark-ribbon ${isBookmarked ? "is-bookmarked" : ""}`}
                      aria-hidden="true"
                    />
                    <div className="study-cover-top">
                      <span className="study-cover-symbol" aria-hidden="true">
                        {activeBook.coverSymbol}
                      </span>
                      <h3 className="study-cover-title">{activeBook.title}</h3>
                      <div className="study-cover-author">{activeBook.author}</div>
                    </div>
                    <div className="study-cover-bottom">
                      <span className="study-cover-badge">
                        {STUDY_GENRES.find((g) => g.id === activeBook.genreId)?.name}
                      </span>
                      <span className="study-cover-pages">{activeBook.pageCount} p.</span>
                    </div>
                  </div>
                </div>

                <div className="study-modal-meta-pills">
                  <button
                    type="button"
                    className={`study-bookmark-btn ${isBookmarked ? "is-bookmarked" : ""}`}
                    onClick={handleToggleBookmark}
                    aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this book"}
                  >
                    <span>{isBookmarked ? "🔖 Bookmarked" : "🏷️ Save Bookmark"}</span>
                  </button>
                  <div className="study-modal-pill">
                    <span>Length</span>
                    <strong>{activeBook.pageCount} pages</strong>
                  </div>
                  {activeBook.publishedYear && (
                    <div className="study-modal-pill">
                      <span>Published</span>
                      <strong>{activeBook.publishedYear}</strong>
                    </div>
                  )}
                  {activeBook.titleUrdu && (
                    <div className="study-modal-pill" dir="rtl" lang="ur">
                      <span>عنوان:</span>
                      <strong>{activeBook.titleUrdu}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Narrative, Rationale, Tabs & Multi-Template Reader */}
              <div className="study-modal-right">
                <h2 id="study-modal-title" className="study-modal-title">
                  {activeBook.title}
                </h2>
                <div className="study-modal-author">by {activeBook.author}</div>

                {/* Personal Editorial Note: Why Picked for Meerah */}
                <div className="study-modal-rationale-box">
                  <div className="study-modal-rationale-title">
                    <span aria-hidden="true">💖</span>
                    <span>Why Picked for {recipientName} · خاص انتخاب کی وجہ</span>
                  </div>
                  <p className="study-modal-rationale-text">
                    &ldquo;{activeBook.ratingRationale}&rdquo;
                  </p>
                </div>

                {/* Main View Tabs */}
                <div className="study-modal-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "about"}
                    className={`study-modal-tab-btn ${
                      activeTab === "about" ? "is-active" : ""
                    }`}
                    onClick={() => setActiveTab("about")}
                  >
                    About Book
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "reader"}
                    className={`study-modal-tab-btn ${
                      activeTab === "reader" ? "is-active" : ""
                    }`}
                    onClick={() => setActiveTab("reader")}
                  >
                    Read Preview Excerpt ({bookChapters.length} Chapters)
                  </button>
                </div>

                {/* Tab Panel: About */}
                {activeTab === "about" && (
                  <div className="study-tab-about-content">
                    <p className="study-modal-desc">{activeBook.description}</p>
                    {activeBook.tags && activeBook.tags.length > 0 && (
                      <div className="study-tags-wrap" aria-label="Book tags">
                        {activeBook.tags.map((tag) => (
                          <span key={tag} className="study-detail-tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Key Quotes if present */}
                    {activeBook.keyQuotes && activeBook.keyQuotes.length > 0 && (
                      <div className="study-quotes-preview">
                        <h4 className="study-quotes-title">Golden Quotes · زریں اقوال</h4>
                        <ul className="study-quotes-list">
                          {activeBook.keyQuotes.map((q, idx) => (
                            <li key={idx} className="study-quote-item">
                              &ldquo;{q}&rdquo;
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Panel: Interactive Multi-Template Reader */}
                {activeTab === "reader" && (
                  <div className="study-reader-container study-excerpt-reader">
                    {/* 8 Reading Presentation Templates Bar */}
                    <div className="study-templates-bar" aria-label="Reading presentation templates">
                      <span className="study-templates-label">Reading Mode:</span>
                      <div className="study-templates-list" role="radiogroup">
                        {READING_TEMPLATES.map((tmpl) => (
                          <button
                            key={tmpl.id}
                            type="button"
                            role="radio"
                            aria-checked={selectedTemplate === tmpl.id}
                            className={`study-template-chip ${
                              selectedTemplate === tmpl.id ? "is-active" : ""
                            }`}
                            onClick={() => setSelectedTemplate(tmpl.id)}
                            title={tmpl.description}
                          >
                            <span aria-hidden="true">{tmpl.icon}</span>
                            <span>{tmpl.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reader Controls Bar: Chapter Navigation, Picker & Font Sizing */}
                    <div className="study-reader-toolbar">
                      <div className="study-chapter-controls">
                        <button
                          type="button"
                          className="study-chapter-nav-btn"
                          onClick={handlePrevChapter}
                          disabled={currentChapterIndex === 0}
                          aria-label="Previous chapter"
                        >
                          &larr; Prev
                        </button>
                        <span className="study-chapter-indicator">
                          Chapter {currentChapterIndex + 1} of {bookChapters.length}
                        </span>
                        <button
                          type="button"
                          className="study-chapter-nav-btn"
                          onClick={handleNextChapter}
                          disabled={currentChapterIndex >= bookChapters.length - 1}
                          aria-label="Next chapter"
                        >
                          Next &rarr;
                        </button>
                      </div>

                      {/* Chapter Picker Selector */}
                      <div className="study-chapter-picker">
                        <label htmlFor="study-chapter-select" className="study-chapter-picker-label">
                          Jump:
                        </label>
                        <select
                          id="study-chapter-select"
                          className="study-chapter-select"
                          value={currentChapterIndex}
                          onChange={(e) => handleSelectChapter(Number(e.target.value))}
                          aria-label="Select chapter"
                        >
                          {bookChapters.map((ch, idx) => (
                            <option key={ch.id || idx} value={idx}>
                              Ch {idx + 1}: {ch.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Font Sizing Controls */}
                      <div className="study-font-controls" role="group" aria-label="Reader text size">
                        <span className="study-font-label">Text:</span>
                        <button
                          type="button"
                          className={`study-font-btn ${readerFontSize === "sm" ? "is-active" : ""}`}
                          onClick={() => setReaderFontSize("sm")}
                          aria-label="Small font size"
                          title="Small text size"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          className={`study-font-btn ${readerFontSize === "md" ? "is-active" : ""}`}
                          onClick={() => setReaderFontSize("md")}
                          aria-label="Medium font size"
                          title="Medium text size"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          className={`study-font-btn ${readerFontSize === "lg" ? "is-active" : ""}`}
                          onClick={() => setReaderFontSize("lg")}
                          aria-label="Large font size"
                          title="Large text size"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* ============================================================== */}
                    {/* Render Selected Reading Presentation Template */}
                    {/* ============================================================== */}
                    <div
                      className={`study-template-viewport template-${selectedTemplate} reader-font-${readerFontSize}`}
                      data-template={selectedTemplate}
                      data-font-size={readerFontSize}
                    >
                      {/* 1. Minimal Template */}
                      {selectedTemplate === "minimal" && (
                        <div className="reader-view-minimal">
                          <h3 className="reader-minimal-title">{activeChapter.title}</h3>
                          <div className="reader-minimal-body">{activeChapter.content}</div>
                        </div>
                      )}

                      {/* 2. Romantic Literary Journal */}
                      {selectedTemplate === "romantic-journal" && (
                        <div className="reader-view-romantic-journal">
                          <div className="romantic-journal-flourish" aria-hidden="true">
                            ❦ 🌸 ❦
                          </div>
                          <h3 className="romantic-journal-title">{activeChapter.title}</h3>
                          <blockquote className="romantic-journal-body">
                            {activeChapter.content}
                          </blockquote>
                          {activeChapter.quote && (
                            <div className="romantic-journal-footer">
                              &ldquo;{activeChapter.quote}&rdquo;
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Manga-Inspired Panel Layout */}
                      {selectedTemplate === "manga-panels" && (
                        <div className="reader-view-manga">
                          <div className="manga-panel-header">
                            <span className="manga-badge">MANGA STRIP · PAGE {currentChapterIndex + 1}</span>
                            <span className="manga-read-direction">◀ READ RIGHT TO LEFT</span>
                          </div>
                          <div className="manga-panel-grid">
                            <div className="manga-panel manga-panel-large">
                              <div className="manga-screentone-bg" />
                              <div className="manga-speech-bubble">
                                <span className="manga-speaker">{activeChapter.speaker || activeBook.author}</span>
                                <p className="manga-bubble-text">{activeChapter.content}</p>
                              </div>
                            </div>
                            {activeChapter.quote && (
                              <div className="manga-panel manga-panel-small">
                                <div className="manga-action-burst">
                                  <span>&ldquo;{activeChapter.quote}&rdquo;</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 4. Anime-Inspired Illustrated Story */}
                      {selectedTemplate === "anime-story" && (
                        <div className="reader-view-anime">
                          <div className="anime-backdrop-glow" />
                          <div className="anime-dialogue-card">
                            <div className="anime-nameplate">
                              <span className="anime-star" aria-hidden="true">✦</span>
                              <span>{activeChapter.speaker || activeBook.author}</span>
                            </div>
                            <h4 className="anime-scene-title">{activeChapter.title}</h4>
                            <p className="anime-dialogue-text">{activeChapter.content}</p>
                            {activeChapter.quote && (
                              <div className="anime-voice-line">
                                &ldquo;{activeChapter.quote}&rdquo;
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 5. Graphic Novel Layout */}
                      {selectedTemplate === "graphic-novel" && (
                        <div className="reader-view-graphic-novel">
                          <div className="graphic-novel-frame frame-red">
                            <div className="graphic-sfx-badge">NARRATIVE</div>
                            <h3 className="graphic-frame-title">{activeChapter.title}</h3>
                            <p className="graphic-frame-text">{activeChapter.content}</p>
                          </div>
                          {activeChapter.quote && (
                            <div className="graphic-novel-frame frame-gold">
                              <div className="graphic-sfx-badge sfx-burst">INSIGHT!</div>
                              <p className="graphic-frame-quote">&ldquo;{activeChapter.quote}&rdquo;</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 6. Bookshelf Template */}
                      {selectedTemplate === "bookshelf" && (
                        <div className="reader-view-bookshelf">
                          <div className="bookshelf-wood-header">
                            <span className="bookshelf-wood-grain">Personal Shelf Reference</span>
                            <span className="bookshelf-ribbon-tag">Ribbon at Chapter {currentChapterIndex + 1}</span>
                          </div>
                          <div className="bookshelf-book-open">
                            <div className="bookshelf-page-left">
                              <h4 className="bookshelf-page-title">{activeBook.title}</h4>
                              <p className="bookshelf-page-author">by {activeBook.author}</p>
                              <div className="bookshelf-spine-crease" />
                            </div>
                            <div className="bookshelf-page-right">
                              <h3 className="bookshelf-chapter-title">{activeChapter.title}</h3>
                              <p className="bookshelf-chapter-text">{activeChapter.content}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 7. Notes Workspace Template */}
                      {selectedTemplate === "notes-workspace" && (
                        <div className="reader-view-notes-workspace">
                          <div className="workspace-reading-column">
                            <h3 className="workspace-chapter-title">{activeChapter.title}</h3>
                            <div className="workspace-chapter-text">{activeChapter.content}</div>
                          </div>
                          <div className="workspace-notes-column">
                            <h4 className="workspace-notes-heading">
                              <span>📝 Study Margin Notes</span>
                            </h4>
                            <form onSubmit={handleAddNote} className="workspace-add-note-form">
                              <input
                                type="text"
                                className="workspace-note-input"
                                placeholder="Add a margin reflection..."
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                              />
                              <button type="submit" className="workspace-note-submit">
                                Post Note
                              </button>
                            </form>
                            <ul className="workspace-notes-list">
                              {userNotes.length === 0 ? (
                                <li className="workspace-note-empty">No notes yet. Type above to record your thoughts.</li>
                              ) : (
                                userNotes.map((note, idx) => (
                                  <li key={idx} className="workspace-note-card">
                                    <span className="workspace-note-pin">📌</span>
                                    <span>{note}</span>
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* 8. Study Cards Template */}
                      {selectedTemplate === "study-cards" && (
                        <div className="reader-view-study-cards">
                          <div className="study-card-deck-header">
                            <span className="study-deck-counter">
                              Card {studyCardIndex + 1} of{" "}
                              {Math.max(1, (activeBook.studyNotes?.length || 0) + (activeBook.keyQuotes?.length || 0) + 1)}
                            </span>
                            <span className="study-card-hint">Click card to reveal reflection</span>
                          </div>
                          <div
                            className={`study-flip-card ${isCardFlipped ? "is-flipped" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setIsCardFlipped(!isCardFlipped)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setIsCardFlipped(!isCardFlipped);
                              }
                            }}
                          >
                            <div className="study-flip-card-inner">
                              <div className="study-flip-card-front">
                                <span className="study-card-kicker">Core Takeaway &middot; سوال و نکتہ</span>
                                <h3 className="study-card-front-title">{activeChapter.title}</h3>
                                <p className="study-card-front-prompt">
                                  How does this chapter shape {activeBook.title}&apos;s message?
                                </p>
                                <span className="study-card-tap-indicator">Tap to reveal insight ↷</span>
                              </div>
                              <div className="study-flip-card-back">
                                <span className="study-card-kicker">Curator Insight &middot; حکمت</span>
                                <p className="study-card-back-text">
                                  {activeBook.studyNotes?.[studyCardIndex] ||
                                    activeChapter.quote ||
                                    activeBook.ratingRationale}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="study-card-nav-controls">
                            <button
                              type="button"
                              className="study-nav-btn"
                              disabled={studyCardIndex === 0}
                              onClick={() => {
                                setIsCardFlipped(false);
                                setStudyCardIndex((prev) => Math.max(0, prev - 1));
                              }}
                              aria-label="Previous study card"
                            >
                              ← Previous Card
                            </button>
                            <button
                              type="button"
                              className="study-nav-btn study-nav-btn-primary"
                              disabled={studyCardIndex >= Math.max(1, (activeBook.studyNotes?.length || 0) + (activeBook.keyQuotes?.length || 0)) - 1}
                              onClick={() => {
                                setIsCardFlipped(false);
                                setStudyCardIndex((prev) => prev + 1);
                              }}
                              aria-label="Next study card"
                            >
                              Next Card →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reading Source Action: Honest Physical Library vs External Link */}
                <div className="study-source-container">
                  {(() => {
                    const sourceInfo = resolveReadingSourceDisplay(activeBook);
                    if (sourceInfo.type === "external" && sourceInfo.url) {
                      return (
                        <a
                          href={sourceInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="study-source-external-btn"
                        >
                          <span>{sourceInfo.label}</span>
                        </a>
                      );
                    }
                    return (
                      <div className="study-source-physical-badge">
                        <span className="study-source-physical-icon" aria-hidden="true">
                          🏡
                        </span>
                        <div>
                          <div className="study-source-physical-title">
                            {sourceInfo.label}
                          </div>
                          <p className="study-source-physical-desc">{sourceInfo.note}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyPanel;
