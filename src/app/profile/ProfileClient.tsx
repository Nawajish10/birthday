"use client";

import React, { useState, useEffect, useRef } from "react";
import { RouteShell } from "@/components/shared/RouteShell";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { EternalusVault } from "@/components/eternalus/EternalusVault";
import { GOOGLE_PHOTOS_DATA } from "@/lib/google-photos-data";
import type { Post } from "@/lib/types";

export function ProfileClient({ unlocked }: { unlocked: boolean }) {
  const [posts, setPosts] = useState<(Post & { url: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEternalus, setShowEternalus] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored =
        localStorage.getItem("birthday-favorites") ||
        localStorage.getItem("birthday_favorites") ||
        "[]";
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState<{
    url: string;
    caption: string;
    kind?: "image" | "video";
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/content")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ignore && d?.posts) setPosts(d.posts);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("birthday-favorites", JSON.stringify(next));
        localStorage.setItem("birthday_favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <RouteShell unlocked={unlocked} headerNote="profile sanctuary · تمہاری دنیا">
      {showEternalus ? (
        <div style={{ marginBottom: "24px" }}>
          <button
            type="button"
            className="button secondary"
            onClick={() => setShowEternalus(false)}
            style={{ marginBottom: "16px", display: "inline-flex", gap: "6px", alignItems: "center" }}
          >
            <span aria-hidden="true">←</span>
            <span>Back to Profile</span>
          </button>
          <EternalusVault
            onSelectPhoto={(p) =>
              setSelected({ url: p.url, caption: p.caption, kind: "image" })
            }
          />
        </div>
      ) : (
        <ProfilePanel
          posts={posts}
          photos={GOOGLE_PHOTOS_DATA}
          loading={loading}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          onSelectMedia={(item) =>
            setSelected({ url: item.url, caption: item.caption, kind: item.kind })
          }
          onOpenEternalus={() => setShowEternalus(true)}
          recipientName="Meerah"
          externalAudioRef={audioRef}
        />
      )}

      {selected && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <button className="close" onClick={() => setSelected(null)}>
            ×
          </button>
          {selected.kind === "video" ? (
            <video
              src={selected.url}
              controls
              playsInline
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img src={selected.url} alt={selected.caption} />
          )}
          <p>{selected.caption}</p>
        </div>
      )}

      <audio ref={audioRef} className="audioElement" />
    </RouteShell>
  );
}
