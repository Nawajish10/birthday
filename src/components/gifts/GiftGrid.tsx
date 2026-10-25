"use client";

import React, { useState, useEffect } from "react";

export interface GiftItem {
  id: string;
  slot_number: number;
  title: string;
  hint: string;
  reward_type: "note" | "letter" | "photo" | "song" | "memory" | "activity";
  reward_content: string;
  media_path?: string;
  is_available: boolean;
  is_revealed: boolean;
}

export function GiftGrid() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string>("");

  const loadGifts = async () => {
    try {
      const res = await fetch("/api/gifts");
      const d = await res.json();
      if (res.ok && Array.isArray(d.gifts)) {
        setGifts(d.gifts);
      } else {
        // Fallback default 25 slots if migration not applied yet
        const fallbacks: GiftItem[] = Array.from({ length: 25 }, (_, i) => ({
          id: `gift-${i + 1}`,
          slot_number: i + 1,
          title: `Gift ${String(i + 1).padStart(2, "0")}`,
          hint: "A birthday surprise",
          reward_type: "note",
          reward_content: "Ordinary days feel golden because you are in them. Happy birthday, Meerah!",
          is_available: true,
          is_revealed: false,
        }));
        setGifts(fallbacks);
      }
    } catch {
      setErrorNotice("Could not load gift surprises. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGifts();
  }, []);

  const handleGiftClick = async (gift: GiftItem) => {
    setErrorNotice("");
    if (!gift.is_available) {
      setErrorNotice(`Gift ${gift.slot_number} will unlock on October 30 (Asia/Kolkata).`);
      return;
    }

    if (gift.is_revealed) {
      setSelectedGift(gift);
      return;
    }

    // Open/reveal gift
    setRevealingId(gift.id);
    try {
      const res = await fetch("/api/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gift_id: gift.id }),
      });
      const d = await res.json();
      if (res.ok && d.gift) {
        setGifts((prev) =>
          prev.map((g) => (g.id === gift.id ? { ...g, ...d.gift, is_revealed: true } : g))
        );
        setSelectedGift({ ...gift, ...d.gift, is_revealed: true });
      } else {
        setErrorNotice(d.error || "Unable to reveal this gift right now.");
      }
    } catch {
      setErrorNotice("Network error. Please try again.");
    } finally {
      setRevealingId(null);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "letter":
        return "✉";
      case "photo":
        return "📷";
      case "song":
        return "♫";
      case "memory":
        return "♡";
      case "activity":
        return "☕";
      default:
        return "✿";
    }
  };

  return (
    <div className="giftAdventWrapper" style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div className="sectionhead">
        <div>
          <span className="kicker">25 Little Surprises · پچیس تحفے</span>
          <h2>Birthday Gifts</h2>
        </div>
        <span className="chip" aria-live="polite">
          {gifts.filter((g) => g.is_revealed).length} / 25 Opened
        </span>
      </div>

      <p style={{ color: "#705d4f", fontSize: "14px", margin: "0 0 18px", fontStyle: "italic" }}>
        25 little moments, letters, wishes, and surprises prepared just for your birthday. Tap an open card to unwrap.
      </p>

      {errorNotice && <div className="error" style={{ marginBottom: "16px" }}>{errorNotice}</div>}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#85756c" }}>
          <span>Arranging Meerah’s 25 gifts… ✿</span>
        </div>
      ) : (
        <div
          className="giftGridContainer"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))",
            gap: "12px",
          }}
        >
          {gifts.map((g) => {
            const isBusy = revealingId === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleGiftClick(g)}
                disabled={isBusy}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  aspectRatio: "1",
                  border: g.is_revealed
                    ? "2px solid #e3c49e"
                    : g.is_available
                    ? "2px solid #b6535f"
                    : "1px dashed #d5c3aa",
                  borderRadius: "16px",
                  background: g.is_revealed
                    ? "linear-gradient(135deg, #fffdf7 0%, #faedd8 100%)"
                    : g.is_available
                    ? "linear-gradient(135deg, #fffaf5 0%, #fceae9 100%)"
                    : "#f4ede1",
                  boxShadow: g.is_available ? "0 4px 14px rgba(70, 50, 30, 0.08)" : "none",
                  cursor: g.is_available ? "pointer" : "not-allowed",
                  padding: "10px",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  position: "relative",
                  color: "#382d27",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: g.is_revealed ? "#9b7040" : g.is_available ? "#b6535f" : "#9e8b7c",
                  }}
                >
                  {String(g.slot_number).padStart(2, "0")}
                </span>

                <span style={{ fontSize: "28px", marginTop: "10px" }}>
                  {g.is_revealed ? getIconForType(g.reward_type) : g.is_available ? "🎁" : "🔒"}
                </span>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    marginTop: "6px",
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%",
                    color: g.is_revealed ? "#4a3c31" : "#705d4f",
                  }}
                >
                  {g.is_revealed ? g.title : g.is_available ? "Open" : "Oct 30"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Reveal Modal */}
      {selectedGift && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedGift(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(35, 25, 20, 0.72)",
            backdropFilter: "blur(6px)",
            display: "grid",
            placeContent: "center",
            padding: "20px",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fffbf2",
              border: "2px solid #e2cbaf",
              borderRadius: "24px",
              padding: "32px 28px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(40, 25, 15, 0.35)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedGift(null)}
              style={{
                position: "absolute",
                right: "16px",
                top: "16px",
                border: 0,
                background: "transparent",
                fontSize: "22px",
                color: "#85756c",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <span style={{ fontSize: "48px", display: "block", marginBottom: "8px" }}>
              {getIconForType(selectedGift.reward_type)}
            </span>

            <span className="kicker" style={{ fontSize: "11px" }}>
              GIFT {String(selectedGift.slot_number).padStart(2, "0")} · {selectedGift.reward_type.toUpperCase()}
            </span>

            <h3
              style={{
                font: "500 28px 'Playfair Display', Georgia, serif",
                margin: "10px 0 8px",
                color: "#302c21",
              }}
            >
              {selectedGift.title}
            </h3>

            {selectedGift.hint && (
              <p style={{ fontStyle: "italic", fontSize: "13px", color: "#9c8270", margin: "0 0 16px" }}>
                "{selectedGift.hint}"
              </p>
            )}

            <div
              style={{
                background: "#f7eedd",
                border: "1px solid #e7d8be",
                borderRadius: "16px",
                padding: "18px 20px",
                margin: "16px 0",
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4a3c31",
                fontFamily: "'Playfair Display', Georgia, serif",
                whiteSpace: "pre-wrap",
              }}
            >
              {selectedGift.reward_content}
            </div>

            <button
              type="button"
              className="button rose"
              onClick={() => setSelectedGift(null)}
              style={{ marginTop: "12px", width: "100%" }}
            >
              Keep in my heart ♡
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
