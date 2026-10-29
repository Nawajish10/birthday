# AI Multi-Agent Orchestration Protocol & Architecture

## 1. Overview & Operating Model
This repository uses a structured multi-agent workflow where a Lead Orchestrator coordinates specialized subagents to work concurrently on decoupled components while preventing integration conflicts.

```
                         ┌───────────────────────────────┐
                         │       Lead Orchestrator       │
                         │ (Architecture, State, Review) │
                         └───────────────┬───────────────┘
         ┌─────────────────┬─────────────┴─────────────┬─────────────────┐
         ▼                 ▼                           ▼                 ▼
  ┌─────────────┐   ┌─────────────┐             ┌─────────────┐   ┌─────────────┐
  │ Music Room  │   │ Realtime &  │             │   Chat UI   │   │  Landing /  │
  │ Specialist  │   │   Crypto    │             │ Specialist  │   │ Content     │
  │(Catalogue,  │   │(PBKDF2/GCM, │             │ (Composer,  │   │ Specialists │
  │ Vinyl, Size)│   │  Services)  │             │  Timeline)  │   │ (Hero, Card)│
  └──────┬──────┘   └──────┬──────┘             └──────┬──────┘   └──────┬──────┘
         │                 │                           │                 │
         └─────────────────┴─────────────┬─────────────┴─────────────────┘
                                         ▼
                                 ┌───────────────┐
                                 │     QA &      │
                                 │  Integration  │
                                 │   Reviewer    │
                                 └───────────────┘
```

---

## 2. File Ownership Boundaries

To eliminate merge conflicts and accidental regression of shared application state:

| Role | Allowed File Paths | Strictly Prohibited Files |
| :--- | :--- | :--- |
| **Agent A (Hero)** | `src/components/landing/HeroSection.tsx`, `hero-section.css`, `test/landing-hero.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Agent B (Card Wall)** | `src/components/landing/ScrapbookCardWall.tsx`, `scrapbook-card-wall.css`, `test/landing-card-wall.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Agent C (Music Card)**| `src/components/landing/LandingMusicCard.tsx`, `landing-music-card.css`, `test/landing-music-card.test.ts` | `src/components/Experience.tsx`, audio engine |
| **Agent D (Book/Memories)**| `src/components/landing/StoryDestinationCards.tsx`, `story-destination-cards.css`, `test/landing-story-cards.test.ts`| `src/components/Experience.tsx`, BookCanvas |
| **Music Room Specialist** | `src/components/music/*`, `test/music-room.test.ts` | `src/components/Experience.tsx`, direct `<audio>` tags, chat files |
| **Realtime & Crypto Specialist** | `src/components/chat/chat-crypto.ts`, `src/lib/chat-service.ts`, `supabase/migrations/*`, `test/chat-crypto.test.ts` | `src/components/Experience.tsx`, JSX UI components, music files |
| **Chat UI Specialist** | `src/components/chat/*` (excluding crypto core), `test/chat-ui.test.ts` | `src/components/Experience.tsx`, `chat-crypto.ts` primitives, music files |
| **Read & Study Specialist**| `src/components/study/*`, `test/study.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Games Specialist**| `src/components/games/*`, `test/games.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Video Specialist**| `src/components/video/*`, `test/video.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Profile Specialist**| `src/components/profile/*`, `test/profile.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Memories & Timeline Specialist**| `src/components/memories/MemoriesPanel.tsx`, `memories-helpers.ts`, `memories.css`, `test/memories-e2e.test.ts` | `src/components/Experience.tsx`, audio singleton |
| **Photo Ingestion Specialist**| `src/components/camera/*`, `test/photo-lifecycle.test.ts`, `test/camera.test.ts` | `src/components/Experience.tsx`, shared tokens |
| **Stories & Music Specialist**| `src/components/memories/StoryViewer.tsx`, `StoryBuilderModal.tsx`, `story-helpers.ts`, `stories.css`, `test/story-music.test.ts` | `src/components/Experience.tsx`, direct `<audio>` tags |
| **QA & Verification Reviewer**| `test/journeys-a-i.test.ts`, `test/media-service.test.ts`, `test/birthday-dates.test.ts` | Any component or CSS implementation files |
| **Lead Orchestrator** | `src/types/media-contracts.ts`, `src/lib/birthday-dates.ts`, `src/lib/media-service.ts`, `src/components/Experience.tsx`, Documentation | Subagent isolated files during active editing |

---

## 3. Strict Orchestration Protocol for Agents

1. **Pure Helper Separation:**
   All pure data models, contracts, and calculation helpers must live in `.ts` files (e.g. `landing-helpers.ts`, `music-catalogue.ts`, `chat-crypto.ts`), keeping JSX (`.tsx`) strictly as presentation shells. This guarantees fast testability with Node's native test runner.

2. **No Monolithic Edits in `Experience.tsx`:**
   Subagents must never edit `src/components/Experience.tsx`. Only the Lead Orchestrator may integrate completed, tested subagent components into the shared shell.

3. **Zero Duplicate Audio Elements (`externalAudioRef={playerRef}`):**
   Subagents must never instantiate duplicate `<audio>` elements or DOM audio singletons. All playback must be delegated via `externalAudioRef={playerRef}` passed down from `Experience.tsx`. This avoids overlapping audio channels, resource leaks, and mobile playback interruptions.

4. **Strict Zero-AI Guarantee in Human Chat:**
   Under no circumstances may subagents connect LLMs, chatbot agents, or automated prompts to the 1-to-1 private chat channel. The private chat is strictly reserved for human communication between Creator and Recipient (Noah AI companion is strictly excluded).

5. **Web Crypto Standards & Client-Side Encryption:**
   All cryptographic operations must use the standard Web Crypto API (`globalThis.crypto.subtle`). Keys must be derived via PBKDF2 (HMAC-SHA-256 with 100,000 iterations) and AES-GCM (256-bit) with fresh 12-byte IVs. Raw keys must remain in volatile browser memory; no plaintext messages or media attachments may be transmitted or persisted to backend storage unencrypted.

6. **Safe Resource Cleanup:**
   Any feature utilizing `URL.createObjectURL` (such as local audio track uploads or voice note previews) must track and revoke object URLs using `URL.revokeObjectURL(url)` upon track change or component unmount.

7. **Zero-Autoplay Guarantee:**
   Media elements (music, video, camera) must require explicit user gesture before playback or hardware acquisition.

8. **Verification Pipeline:**
   Every implementation wave must pass:
   - `npm test`: 100% test pass rate across all suites (400/400 tests).
   - `npx tsc --noEmit`: 0 TypeScript compilation errors.
   - `npm run lint`: 0 ESLint errors and warnings.
   - `npm run build`: Production Next.js build succeeding with exit code 0.

---

## 4. Release 2.0 Multi-Agent Specialization Map

| Workstream | Specialist Agent | Core Files & Ownership | Verification Suite |
| :--- | :--- | :--- | :--- |
| **WS1: Brand System** | Design System Agent | `src/app/layout.tsx`, `src/app/styles.css`, `design.md` | `test/theme-brand-system.test.ts` |
| **WS2: Snap Camera** | Camera & Moments Agent | `src/components/camera/CameraPanel.tsx`, `camera-pipeline.ts`, `camera.css`, `MemoriesPanel.tsx` | `test/camera-snapchat-ui.test.ts` |
| **WS3: Private Chat** | Cryptography & Chat Agent | `src/components/chat/ChatPanel.tsx`, `chat-crypto.ts`, `chat-helpers.ts` | `test/chat-e2e-delivery.test.ts` |
| **WS4: Read & Study** | Literary & Reading Agent | `src/components/study/StudyPanel.tsx`, `study-data.ts`, `study.css` | `test/study-templates-genres.test.ts`, `test/study.test.ts` |
| **WS5: Multiplayer Games** | Games & Realtime Agent | `src/components/games/GamesPanel.tsx`, `game-registry.ts`, `multiplayer-service.ts`, `ConnectFour.tsx`, `TriviaDuel.tsx`, `EscapeRoomPuzzle.tsx`, `WouldYouRather.tsx`, `DailyWordPuzzle.tsx` | `test/games-expanded-multiplayer.test.ts`, `test/games.test.ts` |
| **WS6: Orchestration & QA** | Lead Orchestrator | `src/components/Experience.tsx`, `next.config.ts`, `PRD.md`, `flow.md`, `decisions.md`, `ai-agent.md` | Full repository test suite (400/400 passing) |

---

## 5. Music System Multi-Agent Invariants & Operational Rules

1. **Single Playback Controller Invariant:**
   - All components must interact with playback state via `useMusicStore()` from `@/lib/music/use-music-store`.
   - Never instantiate a competing `<audio>` tag. Retrieve the single DOM audio ref using `getMusicAudioRef()`.
   - StoryViewer must always receive `externalAudioRef={sharedAudioRef}`.

2. **Database Ingestion & RLS Invariants:**
   - Database tables: `music_tracks`, `user_playlists`, `user_playlist_tracks`, `music_likes`, `music_playback_state`, `music_listening_history`, `music_lyrics`.
   - All migrations must be strictly additive using `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`.
   - User-specific tables must enforce `auth.uid() = user_id` Row-Level Security.

3. **Storage & Media Privacy:**
   - Audio files must reside in the private Supabase Storage bucket `birthday-audio` under `audio/{track_id}/{filename}`.
   - Client access must use time-limited signed URLs (60 min) obtained from `/api/music/upload/signed-url`.
   - Never pass service-role keys to browser bundles.

4. **CLI Batch-Import Script Usage:**
   - Script location: `scripts/import-music.ts`.
   - Execution command: `npx tsx scripts/import-music.ts --manifest <path> --audio-dir <path> [--dry-run]`
   - Manifest accepted formats: CSV (`title,artist,album,audio_filename,playlist,duration_seconds`) or JSON.
   - Computes SHA-256 for duplicate detection before storage upload.

5. **Provider-Neutral Streaming Boundary:**
   - Tracks maintain `source_type: 'imported' | 'provider'`.
   - External provider identifiers are isolated in `provider_ref`.
   - No YouTube ripping or DRM circumvention is permitted. Local audio plays without streaming provider dependencies.




---

## 6. Landing Page Contracts & Operational Rules (Wave 2 / 9-Section Architecture)

1. **9-Section Modular Component Ownership:**
   - All landing sections must reside under `src/components/landing/` and be re-exported from `src/components/landing/index.ts`:
     * Section 1: `MidnightBirthdayReveal.tsx` (`midnight-reveal.css`)
     * Section 2: `HeroSection.tsx` (`hero-section.css`)
     * Section 3: `SwipeablePhotoCards.tsx` (`swipeable-photo-cards.css`)
     * Section 4: `PersonalMessagesSection.tsx` (`personal-messages.css`)
     * Section 5: `BirthdayBookInvitation.tsx` (`book-invitation.css`)
     * Section 6: `OurSoundtrackSection.tsx` (`our-soundtrack.css`)
     * Section 7: `MemoriesPreviewSection.tsx` (`memories-preview.css`)
     * Section 8: `ExploreWorldSection.tsx` (`explore-world.css` & `ScrapbookCardWall.tsx`)
     * Section 9: `ClosingMessageSection.tsx` (`closing-message.css`)
   - Pure domain models, constants, and helper functions must be maintained in `landing-helpers.ts` or co-located pure functions to enable fast unit testability without browser overhead.

2. **Single Audio Controller Invariant on Landing Page:**
   - Section 6 (`OurSoundtrackSection`) must strictly delegate playback commands to the parent audio controller via `onTogglePlay` and `onPlayTrack` props.
   - Under no circumstances may landing components instantiate standalone `<audio>` tags or manipulate HTML5 audio directly, preventing audio collisions and memory leaks.

3. **Timezone-Aware Midnight Gating Rules:**
   - The reveal modal must determine date activation using the recipient's timezone (`Asia/Kolkata` default) via `getTimezoneDateParts`.
   - Never use local server time or unadjusted UTC timestamps for midnight gating.
   - Persistence must use deterministic keys formatted as `birthday-reveal-completed-YYYY-10-30`.
   - In automated test suites, `forcePreview={true}` must be supported to allow deterministic testing regardless of calendar date.

4. **Autoplay Policy & Web Audio Chime Synthesis:**
   - Audio playback attempts must catch promise rejections cleanly. If autoplay is rejected by the browser, set `autoplayBlocked = true` and display a prominent "Tap to celebrate ♫" button requiring explicit user gesture.
   - Acoustic music-box fallback must use the Web Audio API (`AudioContext`) with graceful no-op handling in server-side or unsupported environments.

5. **Motion Sensitivity & Accessibility Invariants:**
   - Every landing component stylesheet must implement `@media (prefers-reduced-motion: reduce)`.
   - When reduced motion is preferred, transitions and transforms must be set to `none` or `0.01ms`, vinyl spinning animations must be disabled, and modal pop-in animations must be replaced with instant opacity fades.
   - All interactive controls must define `:focus-visible` outlines with high-contrast offsets.
   - Modal overlays must provide `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and keyboard escape listeners.

6. **Hydration & SSR Safety:**
   - All landing components must include the `"use client"` directive.
   - Direct access to browser globals (`window`, `document`, `localStorage`, `AudioContext`) must be guarded with `typeof window !== "undefined"` checks or wrapped in `useEffect` hooks.
   - `setState` calls must never be executed synchronously within the body of an effect to prevent cascading render loops and comply with React 19 rules.


---

## 7. Google Photos Asset Pipeline, Configuration Contracts & Mobile Layout Rules (Wave 3)

1. **Google Photos Ingestion & Operational Contracts:**
   - All Google Photos operations must route through `/api/photos/google` or `src/lib/google-photos/google-photos-service.ts`.
   - Never query un-whitelisted external photo URLs directly from client components. Allowlisted domains are strictly:
     * `photos.app.goo.gl`
     * `photos.google.com`
     * `*.googleusercontent.com`
   - Every ingested photo must be transformed into the canonical `PhotoAsset` interface (`src/types/media-contracts.ts`).
   - Photos must specify responsive derivative suffixes:
     * Thumbnail / square crop: `=w400-h400-c`
     * High-res preview: `=w1920-h1080`
     * Max bounding dimension: `=s{dimension}`

2. **Configuration Variables & Fallback Hierarchy:**
   - Primary album URL configuration: `process.env.GOOGLE_PHOTOS_ALBUM_URL` (or `NEXT_PUBLIC_GOOGLE_PHOTOS_ALBUM_URL`).
   - Manifest fallback: If external network access is blocked, offline, or returns 404/429, the pipeline must seamlessly fall back to `src/data/google-photos-manifest.json`. Zero image rendering errors or broken image icons are permitted.
   - Cache control: Server route responses must specify `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
   - Sensitive parameter handling: Any query parameters containing `key`, `auth`, `token`, or `secret` must be redacted via `redactSensitiveUrlParams()` before logging to console or telemetry.

3. **Single Authoritative BottomNav Architecture & Mobile Rules:**
   - `BottomNav.tsx` must be rendered exclusively in `src/components/Experience.tsx`.
   - Under no circumstances should individual panels (`ProfilePanel`, `MemoriesPanel`, `MusicRoom`, etc.) render their own duplicate bottom navigation bars.
   - Fixed positioning rules: `position: fixed`, `bottom: 0`, `left: 0`, `right: 0`, `z-index: 999`.
   - Mobile clearance: Shell content containers must include bottom padding equal to `max(64px, calc(56px + env(safe-area-inset-bottom)))` to prevent active content from being obscured behind the navigation bar.
   - Ambient shell headers: Never wrap shared sub-tabs in duplicate ambient headings ("Today is all yours"). All ambient headers were permanently decommissioned in favor of view-specific headers.

4. **Capture Date Integrity Invariant:**
   - Never fabricate synthetic or fake capture dates for photographs without known EXIF metadata.
   - When `hasKnownCaptureDate` is false, the photo must be routed to the curated "Cherished Moments ✿" section in chronological views, and omitted from the "On This Day" anniversary calculation.

5. **Security & Path Traversal Guards:**
   - Any path or filename accepted from external input or manifests must be passed through `sanitizeAssetPath()`.
   - Reject or sanitize any input containing `../`, `..\\`, null bytes (`\0`), leading slashes, or Windows drive prefixes.
   - Never modify or commit secrets into `.env` or `.env.local`. Ensure `.gitignore` continuously protects all environment configuration files.

6. **Accessibility & Focus Trapping Invariants:**
   - All lightboxes, photo viewers, and modal dialogs must trap keyboard focus (`handleLightboxFocusTrap()`).
   - `Escape` key must immediately dismiss open lightboxes and return focus to the trigger element without resetting page scroll position (`scrollPositionRef`).
   - Modals must supply `role="dialog"`, `aria-modal="true"`, and accessible labels (`aria-label` or `aria-labelledby`).
   - All photographic images must define non-empty, meaningful `alt` text.


### 7. Multi-Agent Production Orchestration Architecture (October 2026 Release)

1. **Independent App Router Route System:**
   - The application has transitioned to genuine, independently navigable Next.js App Router routes located in `src/app/`:
     * `/` — Home (Hero, Sweet Birthday Memory, Heartfelt Notes, Photo Cards, Keepsake Book entry)
     * `/memories` — Snapchat-inspired camera, photo uploads, Recent Memories, Albums, Stories
     * `/profile` — Instagram-inspired personal profile for Meerah (30 October 2001), real-time countdown, 6 interests, Highlights, Posts/Favorites
     * `/music` — Spotify-inspired Music Room, search, playlists, Now Playing, MP4 support
     * `/study` — Literary Study Sanctuary, Today's Plan checklist (3/5 completed), notes, resources, bookshelf
     * `/games` — Games Hub featuring 8 playable games (2048, Memory Match couplets, Tic-Tac-Toe, Snake, Word Hunt, Typing Rush, Color Match, Birthday Quiz)
     * `/chat` — WhatsApp-inspired private 1-to-1 chat, Admin ↔ Meerah dual testing, Web Crypto E2EE
   - All routes are protected by server-side scope validation (`readScope("birthday")`) and wrapped in `RouteShell.tsx` with passcode-gate verification fallback.
   - Direct URL entry, browser refresh, link sharing, and back/forward browser history work without 404 errors.

2. **Authoritative Identity & Birthday Invariants:**
   - Recipient Name: **Meerah** (strictly standardized; never Mira or generic names).
   - Authoritative Birth Date: **30 October 2001** (`2001-10-30T00:00:00.000Z`).
   - Dynamic Age & Countdown: Computed on-the-fly from the authoritative date, updating every second.

3. **Shared Navigation & Clearance Invariants:**
   - Single authoritative navigation dock: `src/components/shared/BottomNav.tsx` using Next.js `<Link>` components and dynamic route highlighting via `usePathname()`.
   - Content bottom clearance padding (`.shell-content-with-bottom-nav`) guarantees page elements and footers are never covered by the bottom navigation bar.
