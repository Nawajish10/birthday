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
  StudyTask,
  INITIAL_STUDY_TASKS,
  loadSavedTasks,
  saveTasks,
  StudyNote,
  INITIAL_STUDY_NOTES,
  loadSavedNotes,
  saveNotes,
  STUDY_RESOURCES,
  StudyResource,
  STUDY_TIMETABLE,
  TimetableSlot,
} from "./study-data";

export interface StudyPanelProps {
  initialBooks?: Book[];
  initialGenre?: string;
  recipientName?: string;
  onOpenBook?: (book: Book) => void;
  className?: string;
}

type QuickModalType = "notes" | "resources" | "progress" | "timetable" | null;

export function StudyPanel({
  initialBooks = STUDY_BOOKS,
  initialGenre = "all",
  recipientName = "Meerah",
  onOpenBook,
  className = "",
}: StudyPanelProps) {
  // ==========================================================================
  // Greeting State (Time-Aware)
  // ==========================================================================
  const [greeting, setGreeting] = useState<string>("Good Morning");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good Morning");
    } else if (hour < 17) {
      setGreeting("Good Afternoon");
    } else {
      setGreeting("Good Evening");
    }
  }, []);

  // ==========================================================================
  // Today's Plan Tasks State
  // ==========================================================================
  const [tasks, setTasks] = useState<StudyTask[]>(INITIAL_STUDY_TASKS);

  const [newTaskInput, setNewTaskInput] = useState<string>("");
  const [showAddTaskInput, setShowAddTaskInput] = useState<boolean>(false);

  const completedCount = useMemo(() => {
    return tasks.filter((t) => t.completed).length;
  }, [tasks]);

  const completionPercentage = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round((completedCount / tasks.length) * 100);
  }, [completedCount, tasks.length]);

  const handleToggleTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      saveTasks(updated);
      return updated;
    });
  }, []);

  const handleAddTask = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newTaskInput.trim();
      if (!trimmed) return;
      const newTask: StudyTask = {
        id: `task-${Date.now()}`,
        label: trimmed,
        completed: false,
        category: "Focus",
      };
      setTasks((prev) => {
        const updated = [...prev, newTask];
        saveTasks(updated);
        return updated;
      });
      setNewTaskInput("");
      setShowAddTaskInput(false);
    },
    [newTaskInput]
  );

  const handleResetTasks = useCallback(() => {
    setTasks(INITIAL_STUDY_TASKS);
    saveTasks(INITIAL_STUDY_TASKS);
  }, []);

  // ==========================================================================
  // Quick Actions & Notes Reel State
  // ==========================================================================
  const [activeQuickModal, setActiveQuickModal] = useState<QuickModalType>(null);
  const [notes, setNotes] = useState<StudyNote[]>(INITIAL_STUDY_NOTES);
  const [activeNoteDetail, setActiveNoteDetail] = useState<StudyNote | null>(null);
  const [newNoteFormOpen, setNewNoteFormOpen] = useState<boolean>(false);
  const [newNoteTitle, setNewNoteTitle] = useState<string>("");
  const [newNoteCategory, setNewNoteCategory] = useState<string>("Personal");
  const [newNoteContent, setNewNoteContent] = useState<string>("");
  const [newNoteTags, setNewNoteTags] = useState<string>("");
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const handleCreateNote = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

      const created: StudyNote = {
        id: `note-${Date.now()}`,
        title: newNoteTitle.trim(),
        category: newNoteCategory,
        date: "Just now",
        snippet:
          newNoteContent.trim().slice(0, 110) +
          (newNoteContent.trim().length > 110 ? "..." : ""),
        content: newNoteContent.trim(),
        tags: newNoteTags
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean),
        colorAccent:
          newNoteCategory === "DSA Notes"
            ? "#376E58"
            : newNoteCategory === "Web Dev"
            ? "#523742"
            : "#D4798D",
      };

      setNotes((prev) => {
        const updated = [created, ...prev];
        saveNotes(updated);
        return updated;
      });

      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteTags("");
      setNewNoteFormOpen(false);
      setActiveNoteDetail(created);
    },
    [newNoteCategory, newNoteContent, newNoteTags, newNoteTitle]
  );

  const handleCopyNoteContent = useCallback((note: StudyNote) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    }
  }, []);

  // ==========================================================================
  // Bookshelf & Reader State
  // ==========================================================================
  const [selectedGenre, setSelectedGenre] = useState<string>(initialGenre);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "reader">("about");
  const [selectedTemplate, setSelectedTemplate] = useState<ReadingTemplateId>(
    "romantic-journal"
  );
  const [readerFontSize, setReaderFontSize] = useState<"sm" | "md" | "lg">("md");
  const [readerTheme, setReaderTheme] = useState<"ivory" | "sepia" | "night">("ivory");

  const handleThemeChange = useCallback((theme: "ivory" | "sepia" | "night") => {
    setReaderTheme(theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("birthday-reading-theme", theme);
      } catch {}
    }
  }, []);

  const handleFontSizeChange = useCallback((size: "sm" | "md" | "lg") => {
    setReaderFontSize(size);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("birthday-reader-font-size", size);
      } catch {}
    }
  }, []);

  const isUrduText = useCallback((text?: string): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
  }, []);

  // Reader progression state for active book
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [newMarginNoteText, setNewMarginNoteText] = useState<string>("");
  const [userBookNotes, setUserBookNotes] = useState<string[]>([]);
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
        (p) =>
          (p.percentRead && p.percentRead > 0) ||
          (p.chapterIndex && p.chapterIndex > 0) ||
          p.isBookmarked
      );
      if (entries.length > 0) {
        entries.sort(
          (a, b) =>
            new Date(b.lastReadAt || 0).getTime() -
            new Date(a.lastReadAt || 0).getTime()
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
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load persisted state safely on mount to prevent SSR hydration mismatch
    setTasks(loadSavedTasks());
    setNotes(loadSavedNotes());
    setRecentProgress(getMostRecentProgress());

    try {
      const savedTheme = window.localStorage.getItem("birthday-reading-theme") as
        | "ivory"
        | "sepia"
        | "night"
        | null;
      if (savedTheme && ["ivory", "sepia", "night"].includes(savedTheme)) {
        setReaderTheme(savedTheme);
      }
      const savedSize = window.localStorage.getItem("birthday-reader-font-size") as
        | "sm"
        | "md"
        | "lg"
        | null;
      if (savedSize && ["sm", "md", "lg"].includes(savedSize)) {
        setReaderFontSize(savedSize);
      }
    } catch {}

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
      setUserBookNotes(progress.notes || []);
      setStudyCardIndex(0);
      setIsCardFlipped(false);

      if (onOpenBook) {
        onOpenBook(book);
      }
    },
    [onOpenBook]
  );

  const handleCloseModal = useCallback(() => {
    setActiveBook(null);
  }, []);

  // Keyboard navigation: Escape key closes modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (activeBook) {
          handleCloseModal();
        } else if (activeNoteDetail) {
          setActiveNoteDetail(null);
        } else if (activeQuickModal) {
          setActiveQuickModal(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBook, activeNoteDetail, activeQuickModal, handleCloseModal]);

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

  // Add study margin note handler
  const handleAddMarginNote = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeBook || !newMarginNoteText.trim()) return;
      const updatedNotes = [...userBookNotes, newMarginNoteText.trim()];
      setUserBookNotes(updatedNotes);
      setNewMarginNoteText("");
      saveReadingProgressForBook(activeBook.id, { notes: updatedNotes });
      refreshProgress();
    },
    [activeBook, newMarginNoteText, userBookNotes, refreshProgress]
  );

  return (
    <div className={`study-container ${className}`.trim()}>
      {/* ================================================================== */}
      {/* Header with Greeting & Daily Intent */}
      {/* ================================================================== */}
      <header className="study-header">
        <div className="study-nav-bar">
          <a href="/" className="study-return-home-btn" aria-label="Return Home">
            <span aria-hidden="true">&larr;</span> Return Home
          </a>
        </div>
        <div className="study-kicker">
          <span aria-hidden="true">🌸</span>
          <span>Curated Bookshelf · مطالعہ اور سکون</span>
        </div>
        <h1 className="study-title">
          {greeting}, {recipientName} &mdash; Read &amp; Study
        </h1>
        <p className="study-subtitle-lead">
          Let&apos;s make today productive ✿
        </p>
        <p className="study-subtitle">
          A dedicated, quiet space for algorithmic practice, web mastery, and
          cherished literature. Balance deep focus with reflective evening reads.
        </p>
        <div className="study-header-stats" aria-label="Bookshelf summary">
          <span className="study-stat-item"><b>{totalBooks}</b> Books</span>
          <span className="study-stat-divider" aria-hidden="true">&bull;</span>
          <span className="study-stat-item"><b>{genres.length - 1}</b> Categories</span>
        </div>
      </header>

      {/* ================================================================== */}
      {/* Top Productivity Dashboard: Today's Plan & Quick Action Grid */}
      {/* ================================================================== */}
      <section className="study-dashboard-row" aria-label="Daily study dashboard">
        {/* Left: Today's Plan Card */}
        <div className="study-plan-card">
          <div className="study-plan-card-header">
            <div>
              <div className="study-plan-badge">
                <span>📋</span> Daily Focus · آج کا لائحہ عمل
              </div>
              <h2 className="study-plan-title">Today&apos;s Plan</h2>
            </div>
            <div className="study-plan-status-pill">
              <span className="study-plan-status-count">
                {completedCount}/{tasks.length} completed
              </span>
            </div>
          </div>

          {/* Progress completion bar */}
          <div className="study-plan-progress-wrapper" aria-label={`Progress: ${completionPercentage}% completed`}>
            <div className="study-plan-progress-meta">
              <span className="study-plan-progress-label">Completion Status</span>
              <span className="study-plan-progress-value">{completionPercentage}%</span>
            </div>
            <div className="study-plan-progress-track">
              <div
                className="study-plan-progress-fill"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Checklist of Tasks */}
          <div className="study-plan-checklist" role="list">
            {tasks.map((task) => (
              <label
                key={task.id}
                className={`study-task-item ${task.completed ? "is-completed" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task.id)}
                  className="study-task-checkbox"
                  aria-label={task.label}
                />
                <span className="study-task-custom-box" aria-hidden="true">
                  {task.completed && <span>✓</span>}
                </span>
                <span className="study-task-label">{task.label}</span>
                {task.category && (
                  <span className="study-task-category">{task.category}</span>
                )}
              </label>
            ))}
          </div>

          {/* Add custom task inline form */}
          {showAddTaskInput ? (
            <form onSubmit={handleAddTask} className="study-add-task-form">
              <input
                type="text"
                className="study-add-task-input"
                placeholder="E.g. Revise Binary Search Tree patterns..."
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                autoFocus
              />
              <div className="study-add-task-actions">
                <button type="submit" className="study-btn-primary study-btn-sm">
                  Add Task
                </button>
                <button
                  type="button"
                  className="study-btn-secondary study-btn-sm"
                  onClick={() => setShowAddTaskInput(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="study-plan-footer-actions">
              <button
                type="button"
                className="study-plan-action-btn"
                onClick={() => setShowAddTaskInput(true)}
              >
                <span>+</span> Add Task
              </button>
              <button
                type="button"
                className="study-plan-action-link"
                onClick={handleResetTasks}
                title="Reset to default daily plan"
              >
                Reset Default Checklist
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Action Grid (4 tactile cards) */}
        <div className="study-quick-grid" role="group" aria-label="Quick study actions">
          {/* Card 1: Notes (All Notes) */}
          <button
            type="button"
            className="study-quick-card"
            onClick={() => setActiveQuickModal("notes")}
          >
            <div className="study-quick-icon-wrap" style={{ background: "#E5EDE2", color: "#376E58" }}>
              <span>📝</span>
            </div>
            <div className="study-quick-content">
              <div className="study-quick-kicker">All Notes · نوٹس</div>
              <h3 className="study-quick-title">Notes</h3>
              <p className="study-quick-desc">DSA, Web Dev &amp; reflections</p>
            </div>
            <span className="study-quick-arrow" aria-hidden="true">&rarr;</span>
          </button>

          {/* Card 2: Resources (Study Materials) */}
          <button
            type="button"
            className="study-quick-card"
            onClick={() => setActiveQuickModal("resources")}
          >
            <div className="study-quick-icon-wrap" style={{ background: "#F8E8EC", color: "#D4798D" }}>
              <span>📚</span>
            </div>
            <div className="study-quick-content">
              <div className="study-quick-kicker">Study Materials · ذرائع</div>
              <h3 className="study-quick-title">Resources</h3>
              <p className="study-quick-desc">Curated sheets, visualizers &amp; core guides</p>
            </div>
            <span className="study-quick-arrow" aria-hidden="true">&rarr;</span>
          </button>

          {/* Card 3: Progress (Track Goals) */}
          <button
            type="button"
            className="study-quick-card"
            onClick={() => setActiveQuickModal("progress")}
          >
            <div className="study-quick-icon-wrap" style={{ background: "#FFF0D6", color: "#C69325" }}>
              <span>🎯</span>
            </div>
            <div className="study-quick-content">
              <div className="study-quick-kicker">Track Goals · اہداف</div>
              <h3 className="study-quick-title">Progress</h3>
              <p className="study-quick-desc">Weekly hours, reading count &amp; streaks</p>
            </div>
            <span className="study-quick-arrow" aria-hidden="true">&rarr;</span>
          </button>

          {/* Card 4: Timetable (Your Schedule) */}
          <button
            type="button"
            className="study-quick-card"
            onClick={() => setActiveQuickModal("timetable")}
          >
            <div className="study-quick-icon-wrap" style={{ background: "#EAE6F0", color: "#523742" }}>
              <span>⏰</span>
            </div>
            <div className="study-quick-content">
              <div className="study-quick-kicker">Your Schedule · اوقات نامہ</div>
              <h3 className="study-quick-title">Timetable</h3>
              <p className="study-quick-desc">Deep focus blocks &amp; reading breaks</p>
            </div>
            <span className="study-quick-arrow" aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Recent Notes Card Reel */}
      {/* ================================================================== */}
      <section className="study-notes-section" aria-labelledby="study-recent-notes-heading">
        <div className="study-section-header">
          <div>
            <span className="study-section-kicker">Knowledge Repository · یادداشتیں</span>
            <h2 id="study-recent-notes-heading" className="study-section-title">
              Recent Notes
            </h2>
          </div>
          <div className="study-section-actions">
            <button
              type="button"
              className="study-btn-secondary study-btn-sm"
              onClick={() => setNewNoteFormOpen(true)}
            >
              <span>+</span> New Note
            </button>
            <button
              type="button"
              className="study-btn-ghost study-btn-sm"
              onClick={() => setActiveQuickModal("notes")}
            >
              View All ({notes.length}) &rarr;
            </button>
          </div>
        </div>

        <div className="study-notes-reel">
          {notes.slice(0, 3).map((note) => (
            <article
              key={note.id}
              className="study-note-card"
              role="button"
              tabIndex={0}
              onClick={() => setActiveNoteDetail(note)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveNoteDetail(note);
                }
              }}
              aria-label={`Open note: ${note.title}`}
            >
              <div className="study-note-card-top">
                <span
                  className="study-note-category-pill"
                  style={{
                    color: note.colorAccent || "#523742",
                    borderColor: `${note.colorAccent || "#523742"}44`,
                  }}
                >
                  {note.category}
                </span>
                <span className="study-note-date">{note.date}</span>
              </div>
              <h3 className="study-note-title">{note.title}</h3>
              <p className="study-note-snippet">{note.snippet}</p>
              <div className="study-note-footer">
                <div className="study-note-tags">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="study-note-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
                <span className="study-note-cta">Read &rarr;</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* Curated Bookshelf with Literature & Poetry Excerpts */}
      {/* ================================================================== */}
      <section className="study-bookshelf-wrapper" aria-labelledby="study-bookshelf-heading">
        <div className="study-bookshelf-intro">
          <div className="study-kicker">
            <span aria-hidden="true">📖</span>
            <span>Curated Bookshelf · مطالعہ اور سکون</span>
          </div>
          <h2 id="study-bookshelf-heading" className="study-bookshelf-heading">
            Literary Bookshelf &amp; Excerpts
          </h2>
          <p className="study-bookshelf-sub">
            Handpicked literature, timeless Urdu poetry, and contemplative prose,
            thoughtfully curated for {recipientName}’s gentle afternoons and reflective evenings.
          </p>

          <div className="study-header-stats" aria-label="Bookshelf summary">
            <span className="study-stat-pill">
              <span aria-hidden="true">📚</span>
              <span>{initialBooks.length} Curated Volumes</span>
            </span>
            <span className="study-stat-divider" aria-hidden="true">·</span>
            <span className="study-stat-pill">
              <span aria-hidden="true">🏷️</span>
              <span>{STUDY_GENRES.length} Literary Shelves</span>
            </span>
            <span className="study-stat-divider" aria-hidden="true">·</span>
            <span className="study-stat-pill">
              <span aria-hidden="true">☕</span>
              <span>Cozy Reading Corner</span>
            </span>
          </div>
        </div>

        {/* Continue Reading Card (if active reading progress exists) */}
        {recentProgress && !searchQuery && (
          <div className="study-continue-section" aria-label="Continue reading">
            <div className="study-continue-card">
              <div className="study-continue-left">
                <span className="study-continue-badge">🔖 Continue Reading · جاری رکھیں</span>
                <h3 className="study-continue-title">{recentProgress.book.title}</h3>
                <p className="study-continue-meta">
                  {recentProgress.book.author} · Chapter{" "}
                  {(recentProgress.progress.chapterIndex || 0) + 1}
                </p>
                <div className="study-continue-bar-wrap">
                  <div
                    className="study-continue-bar"
                    style={{
                      width: `${Math.max(recentProgress.progress.percentRead || 10, 10)}%`,
                    }}
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
          </div>
        )}

        {/* Curated Recommendations Highlights (Display Table) */}
        {recommendations.length > 0 && selectedGenre === "all" && !searchQuery && (
          <div
            className="study-recommendations-section"
            aria-labelledby="study-recommendations-heading"
          >
            <div className="study-recommendations-header">
              <h3 id="study-recommendations-heading" className="study-recommendations-title">
                <span aria-hidden="true">✨</span>
                <span>Curator&apos;s Highlights · خاص انتخاب</span>
              </h3>
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
                    <h4 className="study-rec-card-title">{rec.title}</h4>
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
          </div>
        )}

        {/* Search & Genre Filter Bar (12 Canonical Genres) */}
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

        {/* Bookshelf Grid */}
        {filteredBooks.length > 0 ? (
          <div className="study-shelf-grid" aria-label="Bookshelf grid">
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
          </div>
        ) : (
          <div className="study-empty-state">
            <div className="study-empty-icon" aria-hidden="true">
              🔍
            </div>
            <h3 className="study-empty-title">No books found</h3>
            <p className="study-empty-desc">
              We couldn&apos;t find any books matching &ldquo;{searchQuery}&rdquo; in this genre.
            </p>
            <div className="study-empty-actions">
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
              <a href="/" className="study-empty-home-link" aria-label="Return Home">
                Return Home &rarr;
              </a>
            </div>
          </div>
        )}
      </section>

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
                          onClick={() => handleFontSizeChange("sm")}
                          aria-label="Small font size"
                          title="Small text size"
                        >
                          A-
                        </button>
                        <button
                          type="button"
                          className={`study-font-btn ${readerFontSize === "md" ? "is-active" : ""}`}
                          onClick={() => handleFontSizeChange("md")}
                          aria-label="Medium font size"
                          title="Medium text size"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          className={`study-font-btn ${readerFontSize === "lg" ? "is-active" : ""}`}
                          onClick={() => handleFontSizeChange("lg")}
                          aria-label="Large font size"
                          title="Large text size"
                        >
                          A+
                        </button>
                      </div>

                      {/* Reading Theme & Contrast Controls */}
                      <div className="study-theme-controls" role="group" aria-label="Reader theme and contrast">
                        <span className="study-font-label">Theme:</span>
                        <button
                          type="button"
                          className={`study-theme-btn ${readerTheme === "ivory" ? "is-active" : ""}`}
                          onClick={() => handleThemeChange("ivory")}
                          aria-label="Ivory theme (Soft warm paper)"
                          title="Warm Ivory Paper"
                        >
                          Ivory
                        </button>
                        <button
                          type="button"
                          className={`study-theme-btn ${readerTheme === "sepia" ? "is-active" : ""}`}
                          onClick={() => handleThemeChange("sepia")}
                          aria-label="Sepia theme (Parchment contrast)"
                          title="Sepia Parchment"
                        >
                          Sepia
                        </button>
                        <button
                          type="button"
                          className={`study-theme-btn ${readerTheme === "night" ? "is-active" : ""}`}
                          onClick={() => handleThemeChange("night")}
                          aria-label="Night theme (Dark reading contrast)"
                          title="Night Reading Contrast"
                        >
                          Night
                        </button>
                      </div>
                    </div>

                    {/* ============================================================== */}
                    {/* Render Selected Reading Presentation Template */}
                    {/* ============================================================== */}
                    <div
                      className={`study-template-viewport template-${selectedTemplate} reader-font-${readerFontSize} reader-theme-${readerTheme} ${isUrduText(activeChapter.content) ? "is-urdu urdu-reading-text" : ""}`}
                      data-template={selectedTemplate}
                      data-font-size={readerFontSize}
                      data-theme={readerTheme}
                      dir={isUrduText(activeChapter.content) ? "rtl" : "ltr"}
                      lang={isUrduText(activeChapter.content) ? "ur" : "en"}
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
                            <form onSubmit={handleAddMarginNote} className="workspace-add-note-form">
                              <input
                                type="text"
                                className="workspace-note-input"
                                placeholder="Add a margin reflection..."
                                value={newMarginNoteText}
                                onChange={(e) => setNewMarginNoteText(e.target.value)}
                              />
                              <button type="submit" className="workspace-note-submit">
                                Post Note
                              </button>
                            </form>
                            <ul className="workspace-notes-list">
                              {userBookNotes.length === 0 ? (
                                <li className="workspace-note-empty">No notes yet. Type above to record your thoughts.</li>
                              ) : (
                                userBookNotes.map((note, idx) => (
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

      {/* ================================================================== */}
      {/* Quick Action: Notes Modal (All Notes) */}
      {/* ================================================================== */}
      {activeQuickModal === "notes" && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={() => setActiveQuickModal(null)}
        >
          <div
            className="study-modal-content study-quick-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-notes-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="study-modal-header">
              <div className="study-modal-header-info">
                <span className="study-modal-genre-tag">📝 Notes Workspace</span>
                <span className="study-modal-reading-time">{notes.length} Active Notes</span>
              </div>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={() => setActiveQuickModal(null)}
                aria-label="Close notes modal"
              >
                ✕
              </button>
            </div>
            <div className="study-quick-modal-body">
              <div className="study-quick-modal-head-row">
                <div>
                  <h2 id="quick-notes-title" className="study-quick-modal-heading">
                    All Study Notes &amp; Reflections
                  </h2>
                  <p className="study-quick-modal-desc">
                    Personal algorithm notes, architectural ideas, and daily reading insights.
                  </p>
                </div>
                <button
                  type="button"
                  className="study-btn-primary study-btn-sm"
                  onClick={() => setNewNoteFormOpen(true)}
                >
                  + Add New Note
                </button>
              </div>

              <div className="study-quick-notes-list">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="study-quick-note-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setActiveQuickModal(null);
                      setActiveNoteDetail(note);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveQuickModal(null);
                        setActiveNoteDetail(note);
                      }
                    }}
                  >
                    <div className="study-quick-note-head">
                      <span
                        className="study-note-category-pill"
                        style={{
                          color: note.colorAccent || "#523742",
                          borderColor: `${note.colorAccent || "#523742"}44`,
                        }}
                      >
                        {note.category}
                      </span>
                      <span className="study-note-date">{note.date}</span>
                    </div>
                    <h3 className="study-quick-note-title">{note.title}</h3>
                    <p className="study-quick-note-snippet">{note.snippet}</p>
                    <div className="study-note-tags">
                      {note.tags.map((t) => (
                        <span key={t} className="study-note-tag">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Quick Action: Resources Modal (Study Materials) */}
      {/* ================================================================== */}
      {activeQuickModal === "resources" && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={() => setActiveQuickModal(null)}
        >
          <div
            className="study-modal-content study-quick-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-resources-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="study-modal-header">
              <div className="study-modal-header-info">
                <span className="study-modal-genre-tag">📚 Study Materials</span>
                <span className="study-modal-reading-time">Curated for Meerah</span>
              </div>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={() => setActiveQuickModal(null)}
                aria-label="Close resources modal"
              >
                ✕
              </button>
            </div>
            <div className="study-quick-modal-body">
              <h2 id="quick-resources-title" className="study-quick-modal-heading">
                Curated Engineering &amp; Literary Resources
              </h2>
              <p className="study-quick-modal-desc">
                High-yield cheat sheets, algorithmic roadmaps, and quiet literary corners.
              </p>

              <div className="study-resources-grid">
                {STUDY_RESOURCES.map((res: StudyResource) => (
                  <div key={res.id} className="study-resource-card">
                    <div className="study-resource-top">
                      <span className="study-resource-category">{res.category}</span>
                      <span className="study-resource-badge">{res.badge}</span>
                    </div>
                    <h3 className="study-resource-title">{res.title}</h3>
                    <p className="study-resource-desc">{res.description}</p>
                    <div className="study-resource-footer">
                      <span className="study-resource-link-btn">
                        <span>{res.linkText}</span>
                        <span aria-hidden="true">&rarr;</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Quick Action: Progress Modal (Track Goals) */}
      {/* ================================================================== */}
      {activeQuickModal === "progress" && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={() => setActiveQuickModal(null)}
        >
          <div
            className="study-modal-content study-quick-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-progress-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="study-modal-header">
              <div className="study-modal-header-info">
                <span className="study-modal-genre-tag">🎯 Goal Tracker</span>
                <span className="study-modal-reading-time">Study Analytics</span>
              </div>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={() => setActiveQuickModal(null)}
                aria-label="Close progress modal"
              >
                ✕
              </button>
            </div>
            <div className="study-quick-modal-body">
              <h2 id="quick-progress-title" className="study-quick-modal-heading">
                Weekly Mastery &amp; Reading Momentum
              </h2>
              <p className="study-quick-modal-desc">
                Consistent daily discipline compounds into remarkable engineering and poetic depth.
              </p>

              <div className="study-progress-stats-grid">
                <div className="study-stat-metric-card">
                  <span className="study-metric-icon">🔥</span>
                  <div className="study-metric-value">5 Days</div>
                  <div className="study-metric-label">Active Focus Streak</div>
                  <div className="study-metric-hint">Current week momentum</div>
                </div>

                <div className="study-stat-metric-card">
                  <span className="study-metric-icon">💻</span>
                  <div className="study-metric-value">42 Problems</div>
                  <div className="study-metric-label">DSA Patterns Mastered</div>
                  <div className="study-metric-hint">Trees, DP &amp; Two-Pointers</div>
                </div>

                <div className="study-stat-metric-card">
                  <span className="study-metric-icon">📖</span>
                  <div className="study-metric-value">{initialBooks.length} Books</div>
                  <div className="study-metric-label">In Personal Library</div>
                  <div className="study-metric-hint">12 curated shelves</div>
                </div>

                <div className="study-stat-metric-card">
                  <span className="study-metric-icon">⏱️</span>
                  <div className="study-metric-value">4.5 Hrs / Day</div>
                  <div className="study-metric-label">Target Deep Work</div>
                  <div className="study-metric-hint">Balanced with breaks</div>
                </div>
              </div>

              {/* Today's Checklist Progress Recap */}
              <div className="study-progress-recap-box">
                <h4 className="study-progress-recap-title">Today&apos;s Plan Completion</h4>
                <div className="study-plan-progress-track">
                  <div
                    className="study-plan-progress-fill"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
                <p className="study-progress-recap-note">
                  {completedCount} of {tasks.length} tasks completed today ({completionPercentage}%).
                  Every single checked item is a step toward mastery!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Quick Action: Timetable Modal (Your Schedule) */}
      {/* ================================================================== */}
      {activeQuickModal === "timetable" && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={() => setActiveQuickModal(null)}
        >
          <div
            className="study-modal-content study-quick-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-timetable-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="study-modal-header">
              <div className="study-modal-header-info">
                <span className="study-modal-genre-tag">⏰ Daily Timetable</span>
                <span className="study-modal-reading-time">Calm Routine</span>
              </div>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={() => setActiveQuickModal(null)}
                aria-label="Close timetable modal"
              >
                ✕
              </button>
            </div>
            <div className="study-quick-modal-body">
              <h2 id="quick-timetable-title" className="study-quick-modal-heading">
                Meerah&apos;s Daily Focus &amp; Reading Schedule
              </h2>
              <p className="study-quick-modal-desc">
                Structured for intense morning clarity, restorative mid-day breaks, and tranquil literary evenings.
              </p>

              <div className="study-timetable-list">
                {STUDY_TIMETABLE.map((slot: TimetableSlot, idx: number) => (
                  <div
                    key={idx}
                    className={`study-timetable-row type-${slot.type}`}
                  >
                    <div className="study-timetable-time">
                      <span className="study-slot-icon" aria-hidden="true">
                        {slot.icon}
                      </span>
                      <span>{slot.time}</span>
                    </div>
                    <div className="study-timetable-details">
                      <h4 className="study-timetable-title">{slot.title}</h4>
                      <p className="study-timetable-subtitle">{slot.subtitle}</p>
                    </div>
                    <span className={`study-slot-badge badge-${slot.type}`}>
                      {slot.type === "focus"
                        ? "Deep Work"
                        : slot.type === "break"
                        ? "Pause & Rest"
                        : slot.type === "learning"
                        ? "Architecture"
                        : "Wind Down"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Note Detail Reader Modal */}
      {/* ================================================================== */}
      {activeNoteDetail && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={() => setActiveNoteDetail(null)}
        >
          <div
            className="study-modal-content study-note-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="note-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="study-modal-header">
              <div className="study-modal-header-info">
                <span
                  className="study-note-category-pill"
                  style={{
                    color: activeNoteDetail.colorAccent || "#523742",
                    borderColor: `${activeNoteDetail.colorAccent || "#523742"}44`,
                  }}
                >
                  {activeNoteDetail.category}
                </span>
                <span className="study-note-date">{activeNoteDetail.date}</span>
              </div>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={() => setActiveNoteDetail(null)}
                aria-label="Close note view"
              >
                ✕
              </button>
            </div>
            <div className="study-note-detail-body">
              <h2 id="note-detail-title" className="study-note-detail-title">
                {activeNoteDetail.title}
              </h2>
              <div className="study-note-detail-tags">
                {activeNoteDetail.tags.map((t) => (
                  <span key={t} className="study-note-tag">
                    #{t}
                  </span>
                ))}
              </div>
              <div className="study-note-detail-content">
                <p>{activeNoteDetail.content}</p>
              </div>
              <div className="study-note-detail-actions">
                <button
                  type="button"
                  className="study-btn-secondary study-btn-sm"
                  onClick={() => handleCopyNoteContent(activeNoteDetail)}
                >
                  {copiedNoteId === activeNoteDetail.id ? "✓ Copied to Clipboard" : "📋 Copy Note"}
                </button>
                <button
                  type="button"
                  className="study-btn-ghost study-btn-sm"
                  onClick={() => setActiveNoteDetail(null)}
                >
                  Done Reading
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* Create New Note Modal */}
      {/* ================================================================== */}
      {newNoteFormOpen && (
        <div
          className="study-modal-backdrop"
          role="presentation"
          onClick={() => setNewNoteFormOpen(false)}
        >
          <div
            className="study-modal-content study-new-note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-note-form-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="study-modal-header">
              <span className="study-modal-genre-tag">📝 Create Note</span>
              <button
                type="button"
                className="study-modal-close-btn"
                onClick={() => setNewNoteFormOpen(false)}
                aria-label="Close new note form"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="study-new-note-form">
              <h2 id="new-note-form-title" className="study-new-note-title">
                New Study Reflection or Technical Note
              </h2>
              <div className="study-form-group">
                <label htmlFor="new-note-title-input" className="study-form-label">
                  Note Title
                </label>
                <input
                  id="new-note-title-input"
                  type="text"
                  className="study-form-input"
                  placeholder="E.g. Binary Search Tree Inorder Traversal..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  required
                />
              </div>

              <div className="study-form-row">
                <div className="study-form-group">
                  <label htmlFor="new-note-category-select" className="study-form-label">
                    Category
                  </label>
                  <select
                    id="new-note-category-select"
                    className="study-form-select"
                    value={newNoteCategory}
                    onChange={(e) => setNewNoteCategory(e.target.value)}
                  >
                    <option value="DSA Notes">DSA Notes</option>
                    <option value="Web Dev">Web Dev</option>
                    <option value="Personal">Personal &amp; Literature</option>
                    <option value="Systems">Systems &amp; Architecture</option>
                  </select>
                </div>
                <div className="study-form-group">
                  <label htmlFor="new-note-tags-input" className="study-form-label">
                    Tags (comma separated)
                  </label>
                  <input
                    id="new-note-tags-input"
                    type="text"
                    className="study-form-input"
                    placeholder="Trees, DP, Revision"
                    value={newNoteTags}
                    onChange={(e) => setNewNoteTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="study-form-group">
                <label htmlFor="new-note-content-input" className="study-form-label">
                  Note Content &amp; Key Insight
                </label>
                <textarea
                  id="new-note-content-input"
                  className="study-form-textarea"
                  rows={5}
                  placeholder="Record your thoughts, algorithm steps, or reading reflections..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  required
                />
              </div>

              <div className="study-form-actions">
                <button type="submit" className="study-btn-primary">
                  Save Note
                </button>
                <button
                  type="button"
                  className="study-btn-secondary"
                  onClick={() => setNewNoteFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudyPanel;
