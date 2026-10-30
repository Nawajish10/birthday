"use client";

import React, { useState, useEffect, useId } from "react";
import type { JSX } from "react";
import "./personal-reminders.css";

export type ReminderCategory = "self-care" | "reflection" | "daily" | "health" | "special";

export interface PersonalReminderItem {
  id: string;
  title: string;
  dateTime: string; // ISO string e.g. "2026-11-01T09:30"
  category: ReminderCategory;
  notes?: string;
  enabled: boolean;
  createdAt: string;
}

export const DEFAULT_STORAGE_KEY = "meerah_personal_reminders";

export const DEFAULT_STARTER_REMINDERS: PersonalReminderItem[] = [
  {
    id: "rem-1",
    title: "Morning tea & gentle mindfulness stretch",
    dateTime: "2026-11-01T08:30",
    category: "self-care",
    notes: "Take 5 uninterrupted minutes to breathe before starting the day.",
    enabled: true,
    createdAt: "2026-10-30T00:00:00.000Z",
  },
  {
    id: "rem-2",
    title: "Read today's Quranic verse & reflection",
    dateTime: "2026-11-01T09:15",
    category: "reflection",
    notes: "Open the sanctuary Daily Reflections card and reflect on hope and ease.",
    enabled: true,
    createdAt: "2026-10-30T00:00:00.000Z",
  },
  {
    id: "rem-3",
    title: "Hydrate & step outside into the sunlight",
    dateTime: "2026-11-01T12:00",
    category: "health",
    notes: "A fresh glass of water and natural light.",
    enabled: true,
    createdAt: "2026-10-30T00:00:00.000Z",
  },
  {
    id: "rem-4",
    title: "Evening gratitude journal & unwind",
    dateTime: "2026-11-01T21:00",
    category: "self-care",
    notes: "Write down 3 blessings that brought warmth to your heart today.",
    enabled: true,
    createdAt: "2026-10-30T00:00:00.000Z",
  },
];

/**
 * Formats a date/time string into a human-friendly badge with context (Today, Tomorrow, Past, etc.)
 */
export function formatReminderBadge(
  dateTimeStr: string,
  currentDate: Date = new Date()
): { label: string; isPast: boolean; isToday: boolean; isTomorrow: boolean } {
  try {
    const target = new Date(dateTimeStr);
    if (isNaN(target.getTime())) {
      return { label: dateTimeStr || "Upcoming", isPast: false, isToday: false, isTomorrow: false };
    }

    const todayStr = currentDate.toISOString().slice(0, 10);
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const targetDateStr = target.toISOString().slice(0, 10);

    const isToday = targetDateStr === todayStr;
    const isTomorrow = targetDateStr === tomorrowStr;
    const isPast = target.getTime() < currentDate.getTime();

    // Time formatting
    const hours = target.getHours();
    const minutes = String(target.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const timeFormatted = `${displayHours}:${minutes} ${ampm}`;

    if (isToday) {
      return { label: `Today · ${timeFormatted}`, isPast, isToday: true, isTomorrow: false };
    }
    if (isTomorrow) {
      return { label: `Tomorrow · ${timeFormatted}`, isPast: false, isToday: false, isTomorrow: true };
    }

    // Month Day formatting
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[target.getMonth()];
    const day = target.getDate();

    if (isPast) {
      return { label: `Passed · ${month} ${day}`, isPast: true, isToday: false, isTomorrow: false };
    }

    return { label: `${month} ${day} · ${timeFormatted}`, isPast: false, isToday: false, isTomorrow: false };
  } catch {
    return { label: dateTimeStr, isPast: false, isToday: false, isTomorrow: false };
  }
}

/**
 * Creates a new reminder item with generated ID and timestamp.
 */
export function createReminder(
  data: Omit<PersonalReminderItem, "id" | "createdAt">,
  customId?: string
): PersonalReminderItem {
  return {
    id: customId || `rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: data.title.trim(),
    dateTime: data.dateTime,
    category: data.category,
    notes: data.notes?.trim() || undefined,
    enabled: data.enabled ?? true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Updates an existing reminder by ID in an immutable list.
 */
export function updateReminder(
  reminders: PersonalReminderItem[],
  id: string,
  patch: Partial<Omit<PersonalReminderItem, "id" | "createdAt">>
): PersonalReminderItem[] {
  return reminders.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

/**
 * Deletes a reminder by ID from an immutable list.
 */
export function deleteReminder(reminders: PersonalReminderItem[], id: string): PersonalReminderItem[] {
  return reminders.filter((item) => item.id !== id);
}

/**
 * Toggles the enabled / completed status of a reminder.
 */
export function toggleReminder(reminders: PersonalReminderItem[], id: string): PersonalReminderItem[] {
  return reminders.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item));
}

/**
 * Sorts reminders chronologically by date/time ascending.
 */
export function sortRemindersByDate(reminders: PersonalReminderItem[]): PersonalReminderItem[] {
  return [...reminders].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
}

/**
 * Loads reminders from localStorage with fallback to default starter reminders.
 */
export function loadStoredReminders(
  storageKey: string = DEFAULT_STORAGE_KEY,
  storage?: { getItem: (key: string) => string | null }
): PersonalReminderItem[] {
  try {
    const activeStorage =
      storage || (typeof window !== "undefined" && typeof window.localStorage !== "undefined" ? window.localStorage : null);
    if (!activeStorage) return DEFAULT_STARTER_REMINDERS;
    const raw = activeStorage.getItem(storageKey);
    if (!raw) return DEFAULT_STARTER_REMINDERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_STARTER_REMINDERS;
  } catch {
    return DEFAULT_STARTER_REMINDERS;
  }
}

/**
 * Persists reminders into localStorage safely.
 */
export function saveStoredReminders(
  reminders: PersonalReminderItem[],
  storageKey: string = DEFAULT_STORAGE_KEY,
  storage?: { setItem: (key: string, val: string) => void }
): void {
  try {
    const activeStorage =
      storage || (typeof window !== "undefined" && typeof window.localStorage !== "undefined" ? window.localStorage : null);
    if (!activeStorage) return;
    activeStorage.setItem(storageKey, JSON.stringify(reminders));
  } catch {
    // Non-critical in strict sandbox
  }
}

export interface PersonalRemindersProps {
  storageKey?: string;
  initialReminders?: PersonalReminderItem[];
  onRemindersChange?: (reminders: PersonalReminderItem[]) => void;
}

export function PersonalReminders({
  storageKey = DEFAULT_STORAGE_KEY,
  initialReminders,
  onRemindersChange,
}: PersonalRemindersProps): JSX.Element {
  const [reminders, setReminders] = useState<PersonalReminderItem[]>(() => {
    if (initialReminders) return initialReminders;
    return loadStoredReminders(storageKey);
  });

  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [formTime, setFormTime] = useState("10:00");
  const [formCategory, setFormCategory] = useState<ReminderCategory>("self-care");
  const [formNotes, setFormNotes] = useState("");

  const sectionId = useId();

  // Save to storage whenever reminders change
  useEffect(() => {
    saveStoredReminders(reminders, storageKey);
    onRemindersChange?.(reminders);
  }, [reminders, storageKey, onRemindersChange]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormTitle("");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormDate(tomorrow.toISOString().slice(0, 10));
    setFormTime("10:00");
    setFormCategory("self-care");
    setFormNotes("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: PersonalReminderItem) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    if (item.dateTime.includes("T")) {
      const [d, t] = item.dateTime.split("T");
      setFormDate(d);
      setFormTime(t.slice(0, 5));
    }
    setFormCategory(item.category);
    setFormNotes(item.notes || "");
    setIsFormOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const fullDateTime = `${formDate}T${formTime}`;

    if (editingId) {
      setReminders((prev) =>
        updateReminder(prev, editingId, {
          title: formTitle,
          dateTime: fullDateTime,
          category: formCategory,
          notes: formNotes,
        })
      );
    } else {
      const newItem = createReminder({
        title: formTitle,
        dateTime: fullDateTime,
        category: formCategory,
        notes: formNotes,
        enabled: true,
      });
      setReminders((prev) => sortRemindersByDate([...prev, newItem]));
    }

    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleToggle = (id: string) => {
    setReminders((prev) => toggleReminder(prev, id));
  };

  const handleDelete = (id: string) => {
    setReminders((prev) => deleteReminder(prev, id));
  };

  // Filtered list
  const filteredReminders = sortRemindersByDate(
    reminders.filter((item) => {
      if (filter === "active") return item.enabled;
      if (filter === "completed") return !item.enabled;
      return true;
    })
  );

  return (
    <section
      className="personal-reminders-section"
      aria-labelledby={`reminders-title-${sectionId}`}
      data-testid="personal-reminders-section"
    >
      <div className="reminders-container-card">
        {/* Washi tape accents */}
        <div className="washi-tape washi-tape-pink reminders-washi-top-left" aria-hidden="true" />
        <div className="washi-tape washi-tape-sage reminders-washi-top-right" aria-hidden="true" />

        {/* Header */}
        <header className="reminders-header">
          <div className="reminders-header-left">
            <div className="reminders-kicker">
              <span aria-hidden="true">✿</span>
              <span>Daily Companion · یاد دہانی</span>
              <span aria-hidden="true">✿</span>
            </div>
            <h2 id={`reminders-title-${sectionId}`} className="reminders-title">
              Personal Reminders &amp; <em>Gentle Intentions</em>
            </h2>
            <p className="reminders-subtitle">
              Set caring reminders for prayer, self-care, study goals, or little moments of rest.
            </p>
          </div>

          <button
            type="button"
            className="reminders-add-btn"
            onClick={handleOpenAdd}
            aria-label="Add new personal reminder"
          >
            <span aria-hidden="true">＋</span> Add Reminder
          </button>
        </header>

        {/* Add/Edit Drawer Form */}
        {isFormOpen && (
          <form className="reminder-form-card" onSubmit={handleFormSubmit} aria-label="Reminder form">
            <h3 className="reminder-form-title">
              {editingId ? "Edit Reminder ✿" : "Create New Reminder ✿"}
            </h3>

            <div className="reminder-form-grid">
              <div className="reminder-field-group">
                <label htmlFor="reminder-title-input">Title / Intention *</label>
                <input
                  id="reminder-title-input"
                  className="reminder-input"
                  type="text"
                  required
                  placeholder="e.g. Afternoon tea & journal pause"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="reminder-field-group">
                <label htmlFor="reminder-date-input">Date *</label>
                <input
                  id="reminder-date-input"
                  className="reminder-input"
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <div className="reminder-field-group">
                <label htmlFor="reminder-time-input">Time *</label>
                <input
                  id="reminder-time-input"
                  className="reminder-input"
                  type="time"
                  required
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>
            </div>

            <div className="reminder-form-grid" style={{ gridTemplateColumns: "1fr 2fr" }}>
              <div className="reminder-field-group">
                <label htmlFor="reminder-category-select">Category</label>
                <select
                  id="reminder-category-select"
                  className="reminder-select"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ReminderCategory)}
                >
                  <option value="self-care">🌿 Self-Care</option>
                  <option value="reflection">📖 Reflection &amp; Dua</option>
                  <option value="daily">☀️ Daily Routine</option>
                  <option value="health">💧 Health &amp; Water</option>
                  <option value="special">✨ Special Moment</option>
                </select>
              </div>

              <div className="reminder-field-group">
                <label htmlFor="reminder-notes-input">Gentle Note (Optional)</label>
                <input
                  id="reminder-notes-input"
                  className="reminder-input"
                  type="text"
                  placeholder="e.g. Remember to take a deep breath before opening your notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="reminder-form-actions">
              <button
                type="button"
                className="reminder-btn-cancel"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
              <button type="submit" className="reminder-btn-submit">
                {editingId ? "Save Changes" : "Save Reminder"}
              </button>
            </div>
          </form>
        )}

        {/* Filter Navigation Bar */}
        <div className="reminders-filter-bar" role="tablist" aria-label="Filter reminders">
          <button
            type="button"
            className={`reminders-filter-chip ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Reminders ({reminders.length})
          </button>
          <button
            type="button"
            className={`reminders-filter-chip ${filter === "active" ? "active" : ""}`}
            onClick={() => setFilter("active")}
          >
            Upcoming ({reminders.filter((r) => r.enabled).length})
          </button>
          <button
            type="button"
            className={`reminders-filter-chip ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Done ({reminders.filter((r) => !r.enabled).length})
          </button>
        </div>

        {/* Reminders List */}
        {filteredReminders.length > 0 ? (
          <div className="reminders-list" role="list">
            {filteredReminders.map((item) => {
              const badgeInfo = formatReminderBadge(item.dateTime);
              return (
                <article
                  key={item.id}
                  className={`reminder-card ${!item.enabled ? "completed" : ""}`}
                  role="listitem"
                >
                  <div className="reminder-left-col">
                    <button
                      type="button"
                      className={`reminder-toggle-btn ${!item.enabled ? "checked" : ""}`}
                      onClick={() => handleToggle(item.id)}
                      aria-label={item.enabled ? `Mark "${item.title}" done` : `Mark "${item.title}" active`}
                    >
                      {!item.enabled && <span className="reminder-toggle-check" aria-hidden="true">✓</span>}
                    </button>

                    <div className="reminder-details">
                      <h4 className="reminder-title-text">{item.title}</h4>
                      <div className="reminder-meta-row">
                        <span
                          className={`reminder-badge-date ${badgeInfo.isToday ? "is-today" : ""} ${
                            badgeInfo.isPast ? "is-past" : ""
                          }`}
                        >
                          🕒 {badgeInfo.label}
                        </span>
                        <span className="reminder-badge-category">
                          {item.category === "self-care" && "🌿 Self-Care"}
                          {item.category === "reflection" && "📖 Reflection"}
                          {item.category === "daily" && "☀️ Daily"}
                          {item.category === "health" && "💧 Health"}
                          {item.category === "special" && "✨ Special"}
                        </span>
                      </div>
                      {item.notes && <p className="reminder-notes-snippet">{item.notes}</p>}
                    </div>
                  </div>

                  <div className="reminder-action-buttons">
                    <button
                      type="button"
                      className="reminder-icon-btn"
                      onClick={() => handleOpenEdit(item)}
                      aria-label={`Edit ${item.title}`}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      className="reminder-icon-btn delete"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`Delete ${item.title}`}
                    >
                      🗑️
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="reminders-empty-state">
            <div className="reminders-empty-flower" aria-hidden="true">
              ✿
            </div>
            <p className="reminders-empty-text">
              {filter === "completed"
                ? "No completed reminders yet. Every little completed intention will show here."
                : "Your reminder garden is clear! Tap '+ Add Reminder' to set a new intention."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default PersonalReminders;
