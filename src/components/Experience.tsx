"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Card, Post, Story, Game } from "@/lib/types";
import { EternalusVault } from "./eternalus/EternalusVault";
import { ProfilePanel } from "./profile/ProfilePanel";
import { MemoriesPanel } from "./memories/MemoriesPanel";
import { HeroSection } from "./landing/HeroSection";
import { ScrapbookCardWall, type ScrapbookDestination } from "./landing/ScrapbookCardWall";
import { LandingMusicCard } from "./landing/LandingMusicCard";
import { StoryDestinationCards } from "./landing/StoryDestinationCards";
import { StudyPanel } from "./study/StudyPanel";
import { GamesPanel } from "./games/GamesPanel";
import { VideoPanel } from "./video/VideoPanel";
import { ChatPanel } from "./chat/ChatPanel";
import { MusicRoom } from "./music/MusicRoom";
import { PasscodeGate } from "./PasscodeGate";
import { BottomNav } from "./shared/BottomNav";

const BookCanvas = dynamic(() => import("./book/BookCanvas").then(mod => mod.BookCanvas), { ssr: false });

type Payload = { cards: Card[]; posts: (Post & { url: string })[]; stories: (Story & { url: string })[]; games: Game[] };
type Tab = "home" | "profile" | "stories" | "songs" | "study" | "games" | "chat" | "eternalus";
type MusicTrack = { id: string; title: string; artist: string; media_path: string; duration_seconds: number | null; sort_order: number; url: string };
type MusicPlaylist = { id: string; name: string; created_by: string; tracks: MusicTrack[] };
type BookPage = { id: string; title: string; accent: string; body: string; urdu?: string; type: "note" | "photo" | "gallery" | "video" | "song"; url?: string; poster?: string; images?: { url: string; caption: string; kind: "image" | "video" }[]; caption?: string };

const sampleBookPhotos = [
  { url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=82", caption: "A little celebration · ایک چھوٹی سی خوشی" },
  { url: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=82", caption: "A night full of light · روشنیوں بھری رات" },
  { url: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=82", caption: "Together in the moment · ایک خوبصورت لمحہ" }
];
const sampleBookVideo = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

function WelcomeCard({ onContinue, photo }: { onContinue: () => void; photo?: string }) {
  return (
    <main className="welcomeScreen">
      <header className="welcomeHeader"><span className="wordmark">Meerah <i>✿</i></span><span>a little world for you</span></header>
      <div className="welcomeBody">
        <aside className="welcomeSteps" aria-label="Birthday experience steps"><span>01 <b>Passcode</b></span><span className="active">02 <b>A moment with you</b></span><span>03 <b>Your world begins</b></span><p>Take a little breath<br />and let yourself smile.</p></aside>
        <section className="welcomeNote">
          <span className="kicker">A LITTLE MOMENT · JUST FOR YOU</span>
          <h1>A moment<br />with <i>you.</i></h1>
          <p>Before your birthday world opens, take a little moment for yourself. There is no rush. This little place was made with you in mind.</p>
          <button className="button rose" onClick={onContinue} autoFocus>Continue to your birthday <span aria-hidden="true">→</span></button>
          <small>Made with love · تمہارے لیے</small>
        </section>
        <div className="welcomePhoto" role={photo ? undefined : "img"} aria-label={photo ? undefined : "Birthday photo placeholder. Add a photo in the creator studio."}>
          {photo ? <img src={photo} alt="A birthday photo picked by the creator" /> : <div className="welcomePhotoScene"><span>✿</span><small>ADD MEERAH’S PHOTO<br />IN THE CREATOR STUDIO</small></div>}
          <i className="welcomePetal">✿</i>
        </div>
      </div>
      <span className="welcomeFooter">A little world, made just for you ♡</span>
    </main>
  );
}



function BookLeafPage({ page, index }: { page: BookPage; index: number }) {
  return (
    <div className="bookFlipPage">
      <span className="bookFlipOrnament" aria-hidden="true">✿</span>
      <span className="kicker">{page.type.toUpperCase()} · A LITTLE GIFT</span>
      <h3>{page.title} <i>{page.accent}</i></h3>
      <p>{page.body}</p>
      {page.type === "gallery" && (
        <div className="bookFlipGallery">
          {page.images?.slice(0, 4).map(image => (
            <img key={image.url} src={image.url} alt={image.caption || "Birthday photo"} />
          ))}
        </div>
      )}
      {page.type === "photo" && <div className="bookFlipPhoto">✿<small>A PHOTO MEMORY</small></div>}
      {page.type === "video" && <div className="bookFlipMedia">▶<small>A BIRTHDAY VIDEO</small></div>}
      {page.type === "song" && <div className="bookFlipMusic">♫</div>}
      {page.urdu && <p className="bookFlipUrdu" lang="ur" dir="rtl">{page.urdu}</p>}
      <span className="bookFlipNumber">{String(index + 1).padStart(2, "0")}</span>
    </div>
  );
}

export function Experience({ unlocked }: { unlocked: boolean }) {
  const [open, setOpen] = useState(unlocked);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [tab, setTab] = useState<Tab>("home");
  const [data, setData] = useState<Payload>({ cards: [], posts: [], stories: [], games: [] });
  const [loading, setLoading] = useState(unlocked);
  const [bookPage, setBookPage] = useState(0);
  const [bookView, setBookView] = useState<0 | 45 | 90>(0);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("birthday-favorites") || localStorage.getItem("birthday_favorites") || "[]";
      return JSON.parse(stored);
    } catch {
      return [];
    }
  });
  const [selected, setSelected] = useState<{ url: string; caption: string; kind?: string } | null>(null);
  const [useWebGLBook, setUseWebGLBook] = useState(true);
  const [showFullBook, setShowFullBook] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const playerRef = useRef<HTMLAudioElement | null>(null);
  const [musicData, setMusicData] = useState<{ tracks: MusicTrack[]; playlists: MusicPlaylist[] }>({ tracks: [], playlists: [] });
  const [activeTrack, setActiveTrack] = useState<MusicTrack | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);

  useEffect(() => {
    if (open && (tab === "songs" || tab === "home")) {
      fetch("/api/music")
        .then(async r => {
          const d = await r.json().catch(() => ({}));
          if (r.ok) setMusicData(d);
        })
        .catch(() => {});
    }
  }, [open, tab]);

  function playTrack(track: MusicTrack) {
    setActiveTrack(track);
    const audio = playerRef.current;
    if (audio) {
      audio.src = track.url;
      audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    }
  }

  function togglePlayer() {
    const audio = playerRef.current;
    if (!audio) return;
    if (!activeTrack && musicData.tracks.length > 0) {
      playTrack(musicData.tracks[0]);
      return;
    }
    if (audio.paused) audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicPlaying(false));
    else {
      audio.pause();
      setMusicPlaying(false);
    }
  }

  function toggleFavorite(id: string) {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem("birthday-favorites", JSON.stringify(next));
        localStorage.setItem("birthday_favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const bookPages: BookPage[] = [
    ...(data.cards.length ? [{ id: "card-" + data.cards[0].id, type: "note" as const, title: "Happy birthday,", accent: "Meerah", body: data.cards[0].body_en || "May your day be full of love, laughter, and everything you deserve.", urdu: data.cards[0].body_ur || "سالگرہ مبارک، میرا پیار۔" }] : [{ id: "birthday-card-1", type: "note" as const, title: "Happy birthday,", accent: "Meerah", body: "May your day be full of love, laughter, and everything you deserve.", urdu: "سالگرہ مبارک، میرا پیار۔" }]),
    ...(data.cards.length ? data.cards.slice(1).map((card, i) => ({ id: "card-" + card.id, type: "note" as const, title: card.title || "A little wish", accent: "for you", body: card.body_en || "A birthday wish, made just for you.", urdu: card.body_ur || ["تمہاری خوشی ہمیشہ قائم رہے۔", "تمہاری ہر خواہش پوری ہو۔", "تمہاری ہنسی ہمیشہ گونجتی رہے۔", "تمہارا ہر دن محبت سے روشن ہو۔"][i % 4] })) : Array.from({ length: 4 }, (_, i) => ({ id: "birthday-card-" + (i + 2), type: "note" as const, title: ["A little wish", "A day of wonder", "All my love", "Your next chapter"][i], accent: ["for you", "just for you", "always", "begins now"][i], body: ["May your day be full of little things that make you smile.", "May this year bring gentle mornings and bright adventures.", "You make ordinary moments feel like something to keep.", "There is so much joy still waiting around the corner."][i], urdu: ["تمہاری خوشی ہمیشہ قائم رہے۔", "تمہاری ہر خواہش پوری ہو۔", "تمہاری ہنسی ہمیشہ گونجتی رہے۔", "تمہارا ہر دن محبت سے روشن ہو۔"][i] }))),
    ...(data.posts.length ? [{ id: "photos", type: "gallery" as const, title: "A few favourite", accent: "moments", body: "Little moments from your birthday world.", urdu: "چھوٹی چھوٹی یادیں، دل کے بہت قریب۔", images: data.posts.slice(0, 6).map(p => ({ url: p.url, caption: p.caption || p.alt_text || "A birthday memory", kind: p.media_kind })) }] : [{ id: "photos", type: "gallery" as const, title: "A few little", accent: "celebrations", body: "Sample scenes for the book. Replace these with your own memories in the creator studio.", urdu: "خوشیوں کے چند چھوٹے لمحے۔", images: sampleBookPhotos.map(image => ({ ...image, kind: "image" as const })) }]),
    ...(data.stories.some(story => story.media_kind === "video") ? [{ id: "video", type: "video" as const, title: "A birthday wish", accent: "just for you", body: "A creator-added birthday clip. Press play whenever you are ready.", urdu: "تمہارے لیے ایک پیارا سا پیغام۔", url: data.stories.find(story => story.media_kind === "video")?.url, poster: data.posts.find(p => p.media_kind === "image")?.url, caption: data.stories.find(story => story.media_kind === "video")?.caption || "A little birthday hello" }] : [{ id: "video", type: "video" as const, title: "A little moment", accent: "in bloom", body: "A sample flower video while your birthday clips are being prepared. Press play to watch.", urdu: "ہر خوبصورت لمحہ تمہارے نام۔", url: sampleBookVideo, poster: sampleBookPhotos[0].url, caption: "Sample video · replace with a birthday greeting" }]),
    { id: "letter", type: "note", title: "Some things", accent: "stay", body: "Some moments become memories before we even realise it. This page is waiting for a note in your own words, in English or Urdu.", urdu: "تمہاری مسکراہٹ ہر دن کو روشن کر دیتی ہے۔" },
    { id: "song", type: "song", title: "A song for", accent: "Meerah", body: "Open the shared songbook to play a birthday soundtrack. Music always waits for your tap.", urdu: "یہ گیت صرف تمہارے لیے۔", caption: "Your shared birthday playlist" },
    { id: "next-chapter", type: "note", title: "The next chapter", accent: "is yours", body: "That was only the beginning. More little surprises are waiting in Memories, Gifts, and the songbook.", urdu: "تمہاری خوبصورت کہانی آگے بھی جاری ہے۔" }
  ];

  const activeBookPage = bookPages.length > 0 ? Math.min(bookPage, bookPages.length - 1) : 0;

  function turnPage(direction: "next" | "prev") {
    const count = bookPages.length;
    if (count < 2 || turning) return;
    const next = (activeBookPage + (direction === "next" ? 1 : -1) + count) % count;
    setTurning(direction);
    window.setTimeout(() => {
      setBookPage(next);
      setTurning(null);
    }, 1160);
  }

  useEffect(() => {
    if (tab !== "home") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,button,audio,video,[contenteditable=true]")) return;
      e.preventDefault();
      turnPage(e.key === "ArrowRight" ? "next" : "prev");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    fetch("/api/content")
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!ignore && d) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [open]);

  if (open && !welcomeDone) return <WelcomeCard onContinue={() => setWelcomeDone(true)} photo={data.posts.find(post => post.media_kind === "image")?.url} />;

  if (!open) return <PasscodeGate onUnlocked={() => { setOpen(true); location.reload(); }} />;

  const cssBookSpread = (
    <div className="bookStage" onTouchStart={e => { const t = e.touches[0]; e.currentTarget.dataset.startX = String(t.clientX); e.currentTarget.dataset.startY = String(t.clientY); }} onTouchEnd={e => { const sx = Number(e.currentTarget.dataset.startX || 0), sy = Number(e.currentTarget.dataset.startY || 0), dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) turnPage(dx < 0 ? "next" : "prev"); }}>
      <span className="bookSticker stickerBloom" aria-hidden="true">✿</span>
      <span className="bookSticker stickerSpark" aria-hidden="true">✧</span>
      <span className="bookSticker stickerHeart" aria-hidden="true">♡</span>
      <div data-view={bookView} className={`bookSpread ${turning ? `isTurning turn-${turning}` : ""}`}>
        <article className="bookpage bookLeft">
          <span className="kicker">A moment with you</span>
          <div className="bookLeftPhoto">
            {data.posts.find(post => post.media_kind === "image") ? (
              <img src={data.posts.find(post => post.media_kind === "image")?.url} alt="Birthday photo selected by the creator" loading="lazy" />
            ) : (
              <span className="sampleBookPhoto">
                <img src={sampleBookPhotos[0].url} alt="Sample celebration photo; replace with a real memory" loading="lazy" />
                <small>SAMPLE MEMORY · REPLACE ANYTIME</small>
              </span>
            )}
          </div>
          <p lang="ur" dir="rtl">{bookPages[activeBookPage]?.urdu || "تمہاری مسکراہٹ ہر دن کو روشن کر دیتی ہے۔"}</p>
          <p className="translation">A little page made just for you.</p>
          <span className="pageNumber">{String(activeBookPage + 1).padStart(2, "0")}</span>
        </article>
        <article key={activeBookPage} className="bookpage bookRight">
          <span className="bookOrnament" aria-hidden="true">✿</span>
          <div className="giftWords">
            <span className="kicker">{bookPages[activeBookPage]?.type.toUpperCase()} · A LITTLE GIFT</span>
            <h3>{bookPages[activeBookPage]?.title} <i>{bookPages[activeBookPage]?.accent}</i></h3>
            <p>{bookPages[activeBookPage]?.body}</p>
            {bookPages[activeBookPage]?.urdu && <p className="bookUrdu" lang="ur" dir="rtl">{bookPages[activeBookPage]?.urdu}</p>}
            {bookPages[activeBookPage]?.type === "photo" && <div className="bookPlaceholder" role="img" aria-label="Placeholder: birthday photo not uploaded yet">✿<small>{bookPages[activeBookPage]?.caption}</small></div>}
            {bookPages[activeBookPage]?.type === "gallery" && (
              <div className="bookMiniGallery">
                {bookPages[activeBookPage]?.images?.map((image, i) => (
                  <button type="button" key={i} aria-label={`Open ${image.caption}`} onClick={() => setSelected({ url: image.url, caption: image.caption, kind: image.kind })}>
                    {image.kind === "video" ? <video src={image.url} muted playsInline preload="metadata" /> : <img src={image.url} loading="lazy" alt={image.caption} />}
                  </button>
                ))}
              </div>
            )}
            {bookPages[activeBookPage]?.type === "video" && bookPages[activeBookPage]?.url && (
              <video className="bookMedia" controls playsInline preload="metadata" poster={bookPages[activeBookPage]?.poster || data.posts.find(p => p.media_kind === "image")?.url || undefined} src={bookPages[activeBookPage]?.url} />
            )}
            {bookPages[activeBookPage]?.type === "song" && <button className="button secondary" onClick={() => setTab("songs")}>Open the songbook ♫</button>}
          </div>
          <span className="pageNumber">{String(activeBookPage + 1).padStart(2, "0")}</span>
        </article>
        <div key={`flip-${activeBookPage}-${turning}`} className={`bookFlipLeaf ${turning ? `flip-${turning}` : ""}`} aria-hidden="true">
          <div className="bookFlipFront">
            <BookLeafPage page={turning === "next" ? bookPages[activeBookPage] : bookPages[(activeBookPage + 1) % bookPages.length]} index={turning === "next" ? activeBookPage : (activeBookPage + 1) % bookPages.length} />
          </div>
          <div className="bookFlipBack">
            <BookLeafPage page={turning === "next" ? bookPages[(activeBookPage + 1) % bookPages.length] : bookPages[activeBookPage]} index={turning === "next" ? (activeBookPage + 1) % bookPages.length : activeBookPage} />
          </div>
        </div>
      </div>
      <div className="bookControls">
        <button aria-label="Previous page" onClick={() => turnPage("prev")} disabled={!!turning}>←</button>
        <button aria-label="Next page" onClick={() => turnPage("next")} disabled={!!turning}>→</button>
      </div>
      <div className="pageDots" role="group" aria-label="Go to a birthday book page">
        {bookPages.map((page, i) => (
          <button key={page.id} aria-label={`Go to page ${i + 1}`} aria-current={i === activeBookPage ? "page" : undefined} className={i === activeBookPage ? "active" : ""} onClick={() => { if (!turning) { setTurning(i > activeBookPage ? "next" : "prev"); window.setTimeout(() => { setBookPage(i); setTurning(null); }, 1160); } }} />
        ))}
      </div>
      <div className="bookViewControls" role="group" aria-label="Change book viewing angle">
        <span>VIEW</span>
        <button type="button" aria-pressed={bookView === 0} className={bookView === 0 ? "active" : ""} onClick={() => setBookView(0)}>Front</button>
        <button type="button" aria-pressed={bookView === 45} className={bookView === 45 ? "active" : ""} onClick={() => setBookView(45)}>45°</button>
        <button type="button" aria-pressed={bookView === 90} className={bookView === 90 ? "active" : ""} onClick={() => setBookView(90)}>90°</button>
      </div>
    </div>
  );

  return (
    <main className="shell" data-theme="love">
      <header className="appheader">
        <a className="wordmark" onClick={() => setTab("home")}>Meerah <span>✿</span></a>
        <div className="headernote">a little world for you</div>
      </header>

      <nav className="tabs" aria-label="Birthday sections">
        {([["home", "⌂", "Home"], ["stories", "◎", "Memories"], ["profile", "▦", "Profile"], ["songs", "♫", "Songs"], ["study", "📖", "Study"], ["games", "🎮", "Games"], ["chat", "☏", "Chat"]] as [Tab, string, string][]).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? "selected" : ""} onClick={() => setTab(id)}><b>{icon}</b>{label}</button>
        ))}
      </nav>

      <section className="content shell-content-with-bottom-nav">
        {tab === "home" && (
          showFullBook ? (
            <>
              <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setShowFullBook(false)}
                  style={{ display: "inline-flex", gap: "6px", alignItems: "center", fontSize: "12px" }}
                >
                  <span aria-hidden="true">←</span>
                  <span>Back to Scrapbook Landing Page</span>
                </button>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button type="button" className="button secondary" style={{ padding: "5px 12px", fontSize: "10px" }} onClick={() => setUseWebGLBook(v => !v)}>
                    {useWebGLBook ? "Classic Book ▦" : "3D Book View ✿"}
                  </button>
                  <span className="chip" aria-live="polite">
                    {String(activeBookPage + 1).padStart(2, "0")} / {String(bookPages.length).padStart(2, "0")}
                  </span>
                </div>
              </div>
              <div className="sectionhead bookHeading">
                <div>
                  <span className="kicker">Your birthday book · تمہاری سالگرہ</span>
                  <h2>For my <i>baba</i></h2>
                </div>
              </div>
              {useWebGLBook ? (
                <BookCanvas pages={bookPages.map((p, idx) => ({ id: p.id, type: p.type, title: p.title, accent: p.accent, body: p.body, urdu: p.urdu, pageNumber: idx + 1 }))} currentPage={activeBookPage} onPageChange={setBookPage} cssFallback={cssBookSpread} />
              ) : (
                cssBookSpread
              )}
            </>
          ) : (
            <>
              {/* Section 1: Welcome Hero */}
              <HeroSection
                recipientName="Meerah"
                birthdayDate="October 30"
                onOpenWorld={() => {
                  const el = document.getElementById("scrapbook-card-wall");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              />

              {/* Section 2: Interactive Scrapbook Card Wall */}
              <div style={{ marginTop: "32px" }}>
                <ScrapbookCardWall
                  onSelectDestination={(dest: ScrapbookDestination) => {
                    if (dest === "birthday-book") {
                      setShowFullBook(true);
                    } else if (dest === "letter") {
                      const idx = bookPages.findIndex(p => p.id === "letter");
                      setBookPage(idx >= 0 ? idx : 0);
                      setShowFullBook(true);
                    } else if (dest === "songs") {
                      setTab("songs");
                    } else if (dest === "our-memories" || dest === "camera") {
                      setTab("stories");
                    } else if (dest === "study") {
                      setTab("study");
                    } else if (dest === "games") {
                      setTab("games");
                    } else if (dest === "video") {
                      setShowVideoModal(true);
                    }
                  }}
                  unlockedSurprisesCount={data.games.length}
                  favoriteSongsCount={favorites.length}
                />
              </div>

              {/* Section 3: Prominent Music Card */}
              <div style={{ marginTop: "36px" }}>
                <LandingMusicCard
                  tracks={musicData.tracks.map(t => ({ id: t.id, title: t.title, artist: t.artist, url: t.url }))}
                  activeTrack={activeTrack ? { id: activeTrack.id, title: activeTrack.title, artist: activeTrack.artist, url: activeTrack.url } : null}
                  isPlaying={musicPlaying}
                  onTogglePlay={togglePlayer}
                  onPlayTrack={(track) => {
                    const full = musicData.tracks.find(t => t.id === track.id);
                    if (full) playTrack(full);
                  }}
                  onOpenSongbook={() => setTab("songs")}
                  personalNote="A song for every memory we've made so far..."
                />
              </div>

              {/* Section 4 & 5: Story Destination Cards (Book Entry & Memories Preview) */}
              <div style={{ marginTop: "36px" }}>
                <StoryDestinationCards
                  onOpenBook={() => setShowFullBook(true)}
                  onOpenMemories={() => setTab("stories")}
                  onSelectPhoto={(photo) => setSelected(photo)}
                  memories={data.posts.map(p => ({
                    id: p.id,
                    url: p.url,
                    caption: p.caption,
                    alt_text: p.alt_text,
                    media_kind: p.media_kind,
                  }))}
                  totalPagesCount={bookPages.length}
                  loading={loading}
                />
              </div>
            </>
          )
        )}
        {tab === "profile" && (
          <ProfilePanel
            posts={data.posts}
            loading={loading}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelectMedia={setSelected}
            onOpenEternalus={() => setTab("eternalus")}
            recipientName="Meerah"
          />
        )}
        {tab === "songs" && (
          <MusicRoom externalAudioRef={playerRef} />
        )}
        {tab === "stories" && (
          <MemoriesPanel
            externalAudioRef={playerRef}
            onNavigateToProfile={() => setTab("profile")}
          />
        )}
        {tab === "chat" && (
          <ChatPanel />
        )}
        {tab === "games" && (
          <GamesPanel />
        )}
        {tab === "study" && (
          <StudyPanel
            onOpenBook={() => {
              setTab("home");
              setShowFullBook(true);
            }}
          />
        )}
        {tab === "eternalus" && <EternalusVault onSelectPhoto={p => setSelected({ url: p.url, caption: p.caption, kind: "image" })} />}
      </section>
      {/* Persistent Audio Engine for Home & Songs Tabs */}
      <audio
        className="audioElement"
        ref={playerRef}
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
        onEnded={() => setMusicPlaying(false)}
      />
      <footer>Made with love · Built for Meerah · <Link href="/admin">Creator workspace</Link></footer>
      <BottomNav currentTab={tab} onSelectTab={(t) => setTab(t as Tab)} />
      {showVideoModal && (
        <VideoPanel isModal={true} onClose={() => setShowVideoModal(false)} />
      )}
      {selected && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <button className="close">×</button>
          {selected.kind === "video" ? <video src={selected.url} controls playsInline preload="metadata" onClick={e => e.stopPropagation()} /> : <img src={selected.url} alt={selected.caption} />}
          <p>{selected.caption}</p>
        </div>
      )}
    </main>
  );
}
