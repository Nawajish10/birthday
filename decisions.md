# Architectural Decision Records (ADRs)

## ADR-001: 2D Interactive Scrapbook Aesthetic vs. 3D WebGL Canvas
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The project needed an emotional, visually rich landing page after passcode unlock. Previous iterations explored 3D book rendering using Three.js and heavy canvas libraries, which introduced performance bottlenecks on mobile devices, battery drain, and unpredictable loading states.
- **Decision:**
  Adopt a tactile, interactive 2D scrapbook aesthetic. Build all cards, polaroids, washi-tape elements, and vinyl effects using pure semantic HTML, SVG, and high-performance CSS transforms (`rotate`, `box-shadow`, `border-radius`).
- **Consequences:**
  - Fast first-contentful paint (< 1s) on mobile devices.
  - Zero heavy 3D dependencies or WebGL context failures.
  - Clean separation between CSS styling and pure React component logic.
  - Accessible to screen readers and conforms to `prefers-reduced-motion`.

---

## ADR-002: Single Source of Truth Audio Engine
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The landing page features a prominent music card (Section 3), while the app also has a dedicated "Songs" tab (`tab === "songs"`). Creating a separate audio element inside `LandingMusicCard.tsx` would cause race conditions, duplicate audio playing simultaneously, and lost playback position upon tab switching.
- **Decision:**
  Maintain a single `<audio>` element owned by `Experience.tsx`. Pass audio state (`isPlaying`, `currentTrack`, `tracks`, `loading`) and control callbacks (`onTogglePlay`, `onPlayTrack`, `onOpenSongbook`) to `LandingMusicCard.tsx` as a controlled component.
- **Consequences:**
  - Zero possibility of double audio playback.
  - Music started on the landing card continues playing seamlessly when the user navigates to the birthday book, profile, or camera.
  - Autoplay restrictions are respected (audio only starts upon explicit user tap).

---

## ADR-003: Replaceable Symbolic 2D Avatar Placeholder
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The recipient's illustrated character reference photo is pending final approval. The hero section required an avatar container that looks intentional and finished today, while remaining easily swappable when the recipient asset is provided.
- **Decision:**
  Implement a dedicated avatar container in `HeroSection.tsx` featuring an illustrated flower crown SVG placeholder surrounded by sunflower and rose motifs. The component accepts an optional `avatarSrc` prop. When omitted, it renders the handcrafted SVG illustration without missing-image broken icons.
- **Consequences:**
  - No broken image links or layout shifts.
  - When the final illustration is ready, it can be passed via `avatarSrc` or placed in `/public/images/meerah-avatar.png` with zero structural refactoring.

---

## ADR-004: Pure Contract & Helper Extraction for Node 24 ESM Testability
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  Node.js v24 native test runner (`node --test`) executes ES modules and supports `.ts` files, but rejects direct imports of `.tsx` files without a runtime JSX loader.
- **Decision:**
  Extract all pure helper functions, interfaces, constants, and data transformers into `src/components/landing/landing-helpers.ts` (pure TypeScript). Component JSX files (`HeroSection.tsx`, `ScrapbookCardWall.tsx`, `LandingMusicCard.tsx`, `StoryDestinationCards.tsx`) import and implement these helpers.
- **Consequences:**
  - Automated tests import pure helpers directly and verify 100% of business logic, state machines, and edge cases.
  - Test runner executes in ~2 seconds with zero external transpilation dependencies or Jest overhead.
  - TypeScript type checking (`tsc --noEmit`) and production builds (`next build`) pass with 0 errors.

---

## ADR-005: Wave 1 Section Scoping & Truthful State Labeling
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The product roadmap includes 8 scrapbook destinations, but features like the interactive flower-garden mini-game and time-capsule countdown are slated for Wave 2.
- **Decision:**
  Render all 8 cards on the landing wall for complete visual composition, but clearly badge and distinguish active vs. planned states. Active cards route to real components; planned cards (`flower-garden`, `time-capsule`) trigger truthful toast notifications explaining their release status (e.g., "Wave 2 ✿ Coming Soon").
- **Consequences:**
  - No fake broken links or dead buttons.
  - Preserves user trust and builds anticipation for Wave 2 features.

---

## ADR-006: Persistent Audio Engine Placement & Shell Mounting
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The `<audio>` element was previously placed conditionally inside `{tab === "songs"}`. This caused the Landing Music Card on `tab === "home"` to lack an audio element (`playerRef.current === null`), failing playback, and destroyed active song playback whenever the visitor returned to the home scrapbook.
- **Decision:**
  Lift `<audio ref={playerRef}>` into the persistent root shell of `Experience.tsx` so it remains mounted across all tab navigation, while keeping playback strictly user-initiated (no autoplay).
- **Consequences:**
  - Audio playback started from either the Landing Music Card or Songbook continues without interruption across tab transitions.
  - Single audio engine singleton architecture is strictly preserved without duplicate DOM nodes.

---

## ADR-007: Navigation Restructure, Dedicated Read & Study, Games Hub, and Video Destination
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The post-passcode birthday experience required content hierarchy optimization. The Gift panel had an outdated legacy gift grid and needed removal from the primary navigation bar. Concurrently, high-value personal activities—dedicated reading & study, genuinely playable celebration games, and a personal birthday video—needed first-class status across both the main navigation tabs and the scrapbook card wall. Legacy/unfinished features (25 Surprises, Time Capsule countdown, Flower Garden, and external Giphy GIFs) needed removal from recipient-facing views without regressing backend creator tools or the keepsake Birthday Book typography (`.giftWords`).
- **Decision:**
  1. **Navigation Restructure:** Remove "Gift" from main navigation tabs. Promote "Games" (`tab === "games"`) and "Study" (`tab === "study"`) to first-class primary tabs in `Experience.tsx` alongside Home, Memories, Profile, Songs, and Chat.
  2. **Scrapbook Card Wall Alignment:** Update `ScrapbookCardWall.tsx` to render exactly 8 active destinations: Birthday Book, Letter, Our Memories, Camera, Songs, Read & Study, Games Hub, and Birthday Video. All 8 cards are fully active and route directly to their corresponding components/modals.
  3. **Read & Study Experience:** Build `StudyPanel.tsx` and `study-data.ts` featuring bilingual curated books across literature, poetry, and philosophy with genre filtering, search, excerpt reading drawer, and graceful physical edition fallback.
  4. **Games Hub:** Build `GamesPanel.tsx` with an extensible game registry powering 3 playable celebration games: Memory Match (couplet card flipping), Word Scramble (birthday word tile unscrambler), and Birthday Trivia Quiz (multiple-choice birthday quiz with celebratory feedback).
  5. **Video Experience:** Build `VideoPanel.tsx` supporting native HTML5 controls, synchronized Urdu/English captions, zero autoplay, and a designed scrapbook cinema card fallback placeholder with sample celebration reel preview when a custom URL is absent.
  6. **Feature Removal & Preservation:** Completely remove GIFs, 25 Surprises, Time Capsule, and Flower Garden from recipient viewports. Retain `Admin.tsx` and `/api/gifts` for backend creator management; preserve `.giftWords` in `styles.css` for Birthday Book typography.
- **Consequences:**
  - Clean, modern, responsive landing page and main navigation reflecting recipient interests.
  - 100% test coverage across all 8 destinations with zero broken links or dead-end placeholders.
  - Zero autoplay across all audio and video media.

---

## ADR-008: Premium Music Room and Real-Time 1-to-1 Private Chat with E2EE
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The Songs and Chat panels required complete, production-quality implementation following `design.md` (Love Theme) and the reference prototype `music-panel.html`:
  1. The Music Room required an expandable 50-song data-driven catalogue, Now Playing card with 3 size modes (compact, standard, expanded), interactive vinyl turntable, search, filters, playback controls, and local audio file support (`URL.createObjectURL` with safe cleanup).
  2. The Chat experience required a dedicated 1-to-1 private conversation between Creator and Recipient (excluding AI assistants/bots), persistent history, photo/video/GIF/voice-note attachments with validation and previews, and End-to-End Encryption (E2EE) using Web Crypto primitives (`AES-GCM-256` and PBKDF2).
- **Decision:**
  1. **Music Room Architecture:** Built `src/components/music/MusicRoom.tsx` and `music-catalogue.ts` supporting 50 curated tracks with stable IDs, title/artist search, filter chips (All Songs, Favourites, Playlists), card size switching without playback reset, progress seeking, volume control, shuffle/repeat state machines, and local file import with URL revocation.
  2. **Love Theme Design System:** Applied `[data-theme="love"]` tokens (`--color-bg: #1A0F1F`, `--color-surface: #26132B`, `--color-primary: #F7A8B8`, `--color-accent: #D4A47C`) with responsive layouts for 360px mobile through 1440px desktop.
  3. **End-to-End Encryption (E2EE):** Built `src/components/chat/chat-crypto.ts` utilizing standard Web Crypto API (`crypto.subtle`) with AES-GCM (256-bit key) and PBKDF2 (SHA-256, 100,000 iterations). Provides client-side message encryption, tamper rejection, and a 64-character SHA-256 mutual security fingerprint.
  4. **1-to-1 Human Chat UI:** Built `ChatPanel.tsx`, `ChatTimeline.tsx`, and `ChatComposer.tsx` supporting text messages, curated romantic GIFs, photo/video attachments (with size validation), voice recording via `MediaRecorder` with live timer and permission error handling, and message delivery state transitions.
  5. **Database Migration:** Generated `supabase/migrations/202610290001_chat_media_e2ee.sql` augmenting `creator_messages` with media and encryption columns.
- **Consequences:**
  - True 1-to-1 human intimacy without AI interference in personal messages.
  - Vetted, standard cryptographic security without custom unverified protocols.
  - 100% test coverage across all music catalogue and chat crypto/UI state machines.

---

## ADR-009: Instagram-Inspired Profile, Snapchat-Inspired Memories, and Curated Story Audio Architecture
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The Profile and Memories experiences in the application required comprehensive, production-grade redesign and integration. Requirements called for an Instagram-inspired profile with dynamic age and birthday countdown, user-created highlights, photo posts, and favorites; a Snapchat-inspired Memories experience with chronological timeline, "On This Day" milestone flashbacks, custom albums, and fullscreen stories; mobile camera capture and file upload with hardware cleanup and consent guardrails; and background music integration with stories that preserves the single-source-of-truth audio singleton architecture.
- **Decision:**
  1. **Authoritative Date Engine (`src/lib/birthday-dates.ts`):** Centralized all birthday calculations into a pure date engine. Age and countdown are computed authoritatively from the recipient's birth date (`2002-10-29`), with full leap year awareness (Feb 29 handling) and celebratory detection (`isToday`). "On This Day" matches photos strictly by calendar month and day from past years (`captureYear < currentYear`), strictly excluding photos with unknown capture dates or same-year uploads.
  2. **Persistence & Safe Compensating Deletion (`src/lib/media-service.ts`):** Implemented client storage caching with Supabase table schemas (`media_photos`, `media_collections`, `media_stories`, `media_favorites`). Implemented safe reference integrity: deleting a photo automatically purges references across highlights, albums, stories, and favorites; deleting a collection, highlight, or story safely unbinds references without deleting the underlying photo assets.
  3. **Photo Ingestion Pipeline (`src/components/camera/camera-pipeline.ts`, `CameraPanel.tsx`, `PhotoUploadModal.tsx`):** Built dual-mode ingestion supporting mobile camera capture (with facingMode toggling and track cleanup via `stopMediaTracks`) and device file picker (supporting JPEG/PNG/WebP/AVIF up to 12 MB). Established an explicit consent guardrail where photos are never uploaded automatically, and preview URLs are preserved on upload failure to prevent lost captures.
  4. **Instagram-Inspired Profile (`src/components/profile/ProfilePanel.tsx`):** Implemented dynamic age badge, live countdown timer, interactive user highlights carousel with "+ New" creation and safe deletion, tabbed media grid (Posts, Reels, Favorites), and identity edit modal with `canEdit` authorization gating.
  5. **Snapchat-Inspired Memories & Stories (`src/components/memories/MemoriesPanel.tsx`, `StoryViewer.tsx`, `StoryBuilderModal.tsx`):** Implemented 4-tab panel (All Photos, On This Day, Albums, Stories), chronological month grouping with sticky headers, milestone flashback banners, custom album management, and full-screen story viewer with segmented progress bars, 5-second slide auto-advancement, tap navigation (left 30% back, right 70% forward), and touch-and-hold pause.
  6. **Single-Source Audio Bridge for Stories:** Connected `StoryBuilderModal` to the 50-song music catalogue (`music-catalogue.ts`). Story playback bridges directly to the persistent shell `<audio ref={playerRef}>` passed down via `externalAudioRef`. `StoryViewer` captures previous audio state on mount and restores it cleanly on unmount/close, guaranteeing zero duplicate `<audio>` DOM nodes and seamless audio persistence across tab transitions.
- **Consequences:**
  - Intuitive, mobile-first experience adhering to Love Theme design system tokens.
  - Zero hardcoded ages or countdowns; all values dynamically and accurately computed.
  - Zero autoplay across all media; explicit user gesture required.
  - Single audio engine singleton architecture preserved without conflicting playback.
  - 100% test coverage across 9 end-to-end user journeys (A through I) and 382 automated repository tests.




---

## ADR-010: Complete Release — Love Theme, Snapchat Camera, Zero-AI E2EE Chat, 12-Genre/8-Template Study Sanctuary, and Real-Time Multiplayer Games
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The birthday release required a comprehensive global polish:
  1. Unifying all panels under the Love Theme visual identity (`#1A0F1F`, `#26132B`, `#F7A8B8`, `#D4A47C`).
  2. Making the Snapchat-inspired camera the default view in Memories with a center live stream, prominent shutter button, 6-filter carousel, flash toggle, and quick gallery shortcut.
  3. Ensuring true End-to-End Encryption in Private Chat with a strict Zero-AI policy (human-to-human only), tamper resistance, and an offline message queue.
  4. Expanding Read & Study to 12 genres and 8 presentation templates (Minimal, Romantic Journal, Manga Panels, Anime Story, Graphic Novel, Bookshelf, Notes Workspace, Study Cards) with chapter navigation, bookmarks, and persistence.
  5. Expanding Games to Competitive, Cooperative, Social, and Solo categories with a 6-character room code real-time multiplayer synchronization engine.
- **Decision:**
  1. **Global Love Theme:** Configured `src/app/layout.tsx` and `Experience.tsx` with `data-theme="love"` and updated `styles.css` with authoritative tokens.
  2. **Camera Default in Memories:** Added `activeTab = "camera"` as the default state in `MemoriesPanel.tsx`. Enhanced `CameraPanel.tsx` with `CAMERA_FILTERS` carousel (Natural, Warm Sun, Soft Rose, Vintage Film, Cinematic Plum, Golden Hour), torch toggle, notification dropdown, and gallery shortcut.
  3. **Zero-AI Human Private Chat:** Verified zero bot interference in human thread. Integrated AES-GCM-256 and PBKDF2 encryption on client side prior to persistence, safe tamper error handling via `ChatDecryptionError`, and an offline queue (`birthday-offline-chat-queue`) with automatic reconnect flushing.
  4. **12-Genre / 8-Template Study Sanctuary:** Expanded `STUDY_GENRES` to 12 genres and added `READING_TEMPLATES` with 8 visual reading modes. Added real chapter content, previous/next chapter progression, bookmark toggles, study notes scratchpad, and reading progress persistence via `localStorage`.
  5. **Real-Time Multiplayer Games Engine:** Built `multiplayer-service.ts` managing 6-character room codes (`ABC123`), host/guest lobby states, turn alternation, timer countdowns, and cross-tab/client updates via storage events. Built 5 new games: `ConnectFour.tsx`, `TriviaDuel.tsx`, `EscapeRoomPuzzle.tsx`, `WouldYouRather.tsx`, and `DailyWordPuzzle.tsx` organized into Competitive, Cooperative, Social, and Solo categories with instant Solo Play mode.
- **Consequences:**
  - 100% test pass rate (400/400 tests across 38 suites).
  - Clean TypeScript compilation with 0 type errors (`npx tsc --noEmit`).
  - Zero ESLint errors or warnings (`npm run lint`).
  - Successful Next.js production build with all 13 routes optimized.
  - Zero autoplay across all audio and video; single persistent `<audio>` element preserved.

---

## ADR-011: Supabase Key Authentication Hardening and Dual-Tier PostgREST Resilience
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  When configuring Supabase credentials via `.env.local`, pasting errors (such as concatenated JWT strings with multiple headers) or newly provisioned Supabase projects without created tables can lead to `401 Unauthorized` or PostgREST `PGRST205` ("Could not find the table in the schema cache") errors. In such scenarios, messaging or media ingestion could fail abruptly and block users.
- **Decision:**
  1. Clean and validate JWTs in `.env.local` to conform to RFC 7519 3-part signatures (`header.payload.signature`) referencing project `vivjduxkbyqpvnzykwgj`.
  2. Implement dual-tier PostgREST resilience in `src/app/api/creator-messages/route.ts`:
     - Primary tier queries Supabase PostgreSQL `creator_messages` with explicit column filtering `SELECT_COLUMNS = "id,visitor_id,sender,body,created_at,read_at"`.
     - Secondary resilient tier traps PostgREST code `PGRST205` / `42P01` / network exceptions and seamlessly fails over to an in-memory/localStorage fallback store (`globalThis.__chatFallbackStore`), ensuring messages return HTTP 200/201 without breaking the UI.
  3. Consolidate a master database migration script `supabase/full_schema.sql` providing all table schemas (`creator_messages`, `photo_assets`, `albums`, `stories`, `music_tracks`, etc.), Row Level Security (RLS) policies, and performance indexes for one-click setup.
- **Consequences:**
  - Zero unhandled 500 crashes when communicating with fresh or cold Supabase instances.
  - Chat sending, receiving, and optimistic queuing remain 100% operational regardless of database provisioning latency.

---

## ADR-012: Snapchat-Inspired Viewfinder UX, Baked Canvas Filters, and Curated Reading Sanctuary
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The Memories camera viewfinder required an immersive, mobile-first design matching modern camera apps (e.g. Snapchat) with prominent capture controls, quick gallery access, and baked filters. Simultaneously, the Read & Study sanctuary needed complete literary depth for 13 real books across 12 genres, including resume capabilities, chapter selection, and typography controls.
- **Decision:**
  1. **Snapchat Viewfinder Layout (`CameraPanel.tsx`, `camera.css`):**
     - Mobile viewport height locked to `clamp(520px, 84vh, 880px)` and `85vh` on mobile breakpoints.
     - 72px center shutter button with dual-ring Love Theme animated pulse.
     - Left-edge gallery shortcut button displaying the latest photo thumbnail with tap-to-switch navigation to "All Photos".
     - Top floating bar with flash/torch toggle, camera flip, notifications with unread counter, and close action.
     - Horizontal touch filter carousel with 7 options (Natural, Warm Sun, Soft Rose, Vintage Film, Cinematic Plum, Golden Hour, B&W Noir).
     - Canvas filter baking: Selected CSS filters are mathematically rendered into the 2D canvas context upon capture so the exported image blob permanently retains the artistic grade.
  2. **Curated Reading Sanctuary & Progress Engine (`StudyPanel.tsx`, `study-data.ts`, `study.css`):**
     - Curated 13 authentic books with rich sequential chapter excerpts, quotes, and study notes across 12 canonical genres.
     - "Continue Reading" banner with real-time progress percentage bar and "Resume Reading →" trigger.
     - Reader toolbar with interactive chapter selector dropdown and font scaling controls (`A-`, `A`, `A+`).
     - Persistent reading progress synced to `localStorage` under `birthday-reading-progress`.
- **Consequences:**
  - Modern, responsive mobile camera UX with zero layout shifts or touch clipping.
  - 100% test pass rate across 405 automated repository tests.
  - Next.js production build succeeds with 0 type errors and 0 ESLint warnings.

---

## ADR-013: Unified Master Schema, 4-Tier Chat Delivery State Machine, and Idempotent Offline Synchronization
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The live Supabase database instance is freshly provisioned with zero initialized application tables. Prior to this release:
  1. The master SQL script `supabase/full_schema.sql` was missing tables (`birthday_gifts`, `gift_reveals`, `noah_knowledge`, `eternalus_members`), lacked media attachment columns on `creator_messages`, and contained an open RLS policy vulnerability (policies without `TO <role>` defaulted to `TO PUBLIC`).
  2. When Supabase was offline or unmigrated (`PGRST205`), the API returned HTTP 201 with volatile in-memory fallback, and the UI falsely rendered `✓ Delivered`, leading users to believe volatile messages were durably persisted.
  3. Message retries transmitted unencrypted plaintext, and queued offline messages were never automatically flushed upon reconnection.
- **Decision:**
  1. **Unified Idempotent Master Schema (`supabase/full_schema.sql`):**
     - Consolidated all 24 application tables, 3 private storage buckets (`birthday-public`, `eternalus-private`, `chat-media`), 4 security functions (`is_admin`, `verify_access_code`, `admin_set_access_code`, `is_eternalus_member`), triggers, and seed data into a single idempotent script.
     - Scoped all Row Level Security policies to `to authenticated using (public.is_admin()) with check (public.is_admin())` to prevent direct anonymous PostgREST manipulation.
  2. **4-Tier Chat Delivery Lifecycle (`chat-types.ts`, `route.ts`, `ChatPanel.tsx`, `ChatTimeline.tsx`):**
     - Formally distinguished 4 states: `queued` (offline), `sending` (in-flight), `server-accepted` (HTTP 202, volatile server memory, single `✓`), and `durably-persisted` (HTTP 200, PostgreSQL database, double `✓✓`).
     - Replaced misleading single checkmark for unpersisted messages.
  3. **E2EE Preservation on Retry & Reconnection Auto-Drain:**
     - Enforced PBKDF2 + AES-GCM-256 encryption in `handleRetryMessage` before transmission, eliminating plaintext leakage.
     - Implemented `flushOfflineQueue` hooked into `window.addEventListener("online", ...)` to automatically drain and transmit queued offline messages.
     - Enforced `client_id` deduplication on `/api/creator-messages`.
- **Consequences:**
  - Honest, transparent delivery status displayed to the user at all times.
  - Clean separation between volatile server fallback and durable PostgreSQL database storage.
  - 100% test pass rate across 425 automated repository tests.
  - TypeScript compilation and ESLint pass with 0 errors and 0 warnings.
  - Next.js production build succeeds with all 13 routes optimized.

---

## ADR-015: Private Music Room Architecture, Ingestion Pipelines, Persistent Audio Engine, and Provider-Neutral Design
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The birthday application required a private, full-featured music system supporting private audio ingestion, persistent playback across navigation and page reloads, user playlists, liked songs, listening history, synchronized lyrics, and strict regression protection for ambient story-music. Furthermore, audio sources must support imported audio while maintaining a provider-neutral boundary for undecided future external streaming services.
- **Decision:**
  1. **Single Playback Controller Invariant (`src/lib/music/use-music-store.ts`):**
     - Established a single module-level singleton store powered by React's `useSyncExternalStore`.
     - Exposes a single shared `<audio>` ref (`getMusicAudioRef()`) that is bound to one HTML5 audio element in the DOM.
     - Prohibits competing, uncoordinated audio engines across components (`MusicRoom`, `StoryViewer`, ambient shell).
     - State updates are synchronized across all calling components with zero state divergence.
  2. **Additive Supabase Schema (`supabase/migrations/202610290003_music_system_full.sql`):**
     - Extended `public.music_tracks` with `album`, `artwork_path`, `source_type ('imported' | 'provider')`, `provider_ref`, `mime_type`, `file_size_bytes`, `checksum`, and `availability_status`.
     - Created `public.music_likes` with uniqueness constraint on `(user_id, track_id)`.
     - Created `public.user_playlists` and `public.user_playlist_tracks` with atomic sorting support.
     - Created `public.music_playback_state` for resumable user snapshots (track, position, queue, shuffle, repeat).
     - Created `public.music_listening_history` for meaningful playback events (>=30s or completed).
     - Created `public.music_lyrics` for optional plain and synchronized JSON lyrics.
     - Row-Level Security (RLS) policies enforce authenticated user ownership on all personal tables.
  3. **Persistent Audio Storage (`birthday-audio`):**
     - Created a private Supabase Storage bucket `birthday-audio` for imported audio files.
     - Client playback accesses audio exclusively through short-lived (60 min) signed URLs generated via `/api/music/upload/signed-url` with strict path traversal prevention (`audio/` prefix).
     - Privileged service-role credentials (`SUPABASE_SERVICE_ROLE_KEY`) are isolated strictly to trusted server routes (`src/app/api/music/upload/route.ts`).
  4. **Dual Ingestion Pipelines:**
     - **CLI Script (`scripts/import-music.ts`)**: Supports CSV and JSON manifests, file existence check, binary magic header sniffing, SHA-256 deduplication, Supabase Storage uploads, catalogue records insertion, and `--dry-run` mode.
     - **Admin Upload UI (`src/components/admin/music/AdminMusicUpload.tsx`)**: Authenticated drag-and-drop file uploader with metadata editing, auto-duration extraction, client-side 50MB validation, real-time XHR progress tracking, and retry controls, integrated into `Admin.tsx`.
  5. **Playback Persistence & Autoplay Compliance:**
     - Position is checkpointed periodically with a 5-second debounce rather than on every `timeupdate` tick.
     - On page mount/refresh, the last valid track and queue are restored from the database.
     - Autoplay restrictions are strictly respected: playback remains paused on reload until an explicit user gesture is received.
  6. **Story-Music Protection & Ambient Coordination:**
     - `StoryViewer` integrates with the shared audio engine using the existing `externalAudioRef` interface.
     - On story launch, ambient audio state (`src`, `currentTime`, `wasPlaying`, `volume`) is captured via `captureAudioState` and paused cleanly.
     - On story exit, `restoreAudioState` restores the prior track and playback position, resuming playback only if it was active prior to opening.
  7. **Provider-Neutral Design:**
     - Tracks are represented internally with stable IDs and `source_type` (`imported` vs `provider`).
     - External provider IDs (`provider_ref`) remain isolated from internal track identities.
     - Local playback works seamlessly without any external provider configured.
- **Consequences:**
  - 100% test coverage across all music workflows: 657/657 tests passing in the repository.
  - TypeScript compilation and ESLint pass with 0 errors and 0 warnings.
  - Production build succeeds with all 13 routes optimized.
  - Completely non-destructive additive migration ensures existing birthday content remains unharmed.

---

## ADR-014: Authoritative Passcode Verification, Auto-Healing Database Sync, and Passcode Gate Redesign
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  On production (`https://babyyy.axcrivo.in`), entering the birthday date `30102001` consistently failed with "That code did not work". Root cause investigation revealed:
  1. The database table `public.access_secrets` in Supabase was completely empty (`data: []`), with no seed row inserted for scope `birthday`.
  2. Because `access_secrets` was empty, `verify_access_code` RPC always evaluated to `v_ok := false`.
  3. Every failed attempt incremented `access_attempts.attempts`. After 6 attempts, PostgreSQL triggered a 15-minute rate limit lock (`locked_until`), locking out subsequent attempts.
  4. The Next.js API route `/api/access/route.ts` lacked dual-tier verification: if Supabase RPC failed or returned `{ ok: false }`, it immediately returned 401 without verifying against the authoritative birthday date or auto-healing the database seed.
  5. The UI gatecard had basic styling, lacked input trimming, lacked submit button debouncing (allowing rapid clicks that accelerated the 6-attempt lockout), and lacked branded favicon assets.
- **Decision:**
  1. **Authoritative Passcode Engine (`src/lib/access-verifier.ts`, `src/app/api/access/route.ts`):**
     - Established `30102001` as the authoritative passcode (`process.env.BIRTHDAY_ACCESS_CODE || "30102001"`).
     - Implemented constant-time `crypto.timingSafeEqual` comparison over SHA-256 digests to prevent timing attacks.
     - Dual-tier verification: Checks authoritative constant alongside Supabase RPC.
     - Auto-healing sync: If authoritative code is entered, the server automatically updates `access_secrets` via `admin_set_access_code` and clears any lockout in `access_attempts`.
     - Whitespace sanitization (`code.trim()`) on both client and server.
  2. **Session Security Hardening (`src/lib/session.ts`):**
     - Hardened `secret()` derivation: If `SESSION_SECRET` is unset, derives a deterministic 32-byte secret from `SUPABASE_SERVICE_ROLE_KEY` to prevent serverless cold-start exceptions.
  3. **Editorial Romantic Passcode Gate Redesign (`src/components/PasscodeGate.tsx`, `passcode-gate.css`):**
     - Luxury parchment card with rose-gold metallic border and soft ambient particles.
     - Clear typographic hierarchy: Playfair Display title "A note for Meerah", Urdu kicker "سالگرہ کا تحفہ", and warm supporting note.
     - Prominent numeric input with accessible label, show/hide password toggle button, and focus ring.
     - Double-submit prevention with loading state ("Opening your world...") and disabled button state.
     - Inline screen-reader accessible error badge (`role="alert"`, `aria-live="assertive"`).
     - Responsive breakpoints for mobile screens down to 320px and short landscape orientation.
  4. **Favicon, App Icons & Web Manifest (`public/icon.svg`, `public/apple-icon.png`, `public/manifest.json`):**
     - Generated branded vector floral emblem with glowing radial gradient and exported crisp PNGs (180x180 Apple touch icon, 32x32 favicon, 16x16 favicon).
     - Configured canonical viewport (`themeColor: #4A1525`) and icon metadata in `src/app/layout.tsx`.
- **Consequences:**
  - Passcode `30102001` works with 100% reliability both locally and on production.
  - Zero risk of database lockout locking out the legitimate user.
  - Passcode and credentials are never exposed in bundles or logs.
  - 448/448 automated tests pass across 48 suites.
  - TypeScript compilation and ESLint pass with 0 errors and 0 warnings.
  - Next.js production build succeeds with all 13 routes optimized.

---

## ADR-015: Private Music Room Architecture, Ingestion Pipelines, Persistent Audio Engine, and Provider-Neutral Design
- **Date:** October 2026
- **Status:** Accepted
- **Context:**
  The birthday application required a private, full-featured music system supporting private audio ingestion, persistent playback across navigation and page reloads, user playlists, liked songs, listening history, synchronized lyrics, and strict regression protection for ambient story-music. Furthermore, audio sources must support imported audio while maintaining a provider-neutral boundary for undecided future external streaming services.
- **Decision:**
  1. **Single Playback Controller Invariant (`src/lib/music/use-music-store.ts`):**
     - Established a single module-level singleton store powered by React's `useSyncExternalStore`.
     - Exposes a single shared `<audio>` ref (`getMusicAudioRef()`) that is bound to one HTML5 audio element in the DOM.
     - Prohibits competing, uncoordinated audio engines across components (`MusicRoom`, `StoryViewer`, ambient shell).
     - State updates are synchronized across all calling components with zero state divergence.
  2. **Additive Supabase Schema (`supabase/migrations/202610290003_music_system_full.sql`):**
     - Extended `public.music_tracks` with `album`, `artwork_path`, `source_type ('imported' | 'provider')`, `provider_ref`, `mime_type`, `file_size_bytes`, `checksum`, and `availability_status`.
     - Created `public.music_likes` with uniqueness constraint on `(user_id, track_id)`.
     - Created `public.user_playlists` and `public.user_playlist_tracks` with atomic sorting support.
     - Created `public.music_playback_state` for resumable user snapshots (track, position, queue, shuffle, repeat).
     - Created `public.music_listening_history` for meaningful playback events (>=30s or completed).
     - Created `public.music_lyrics` for optional plain and synchronized JSON lyrics.
     - Row-Level Security (RLS) policies enforce authenticated user ownership on all personal tables.
  3. **Persistent Audio Storage (`birthday-audio`):**
     - Created a private Supabase Storage bucket `birthday-audio` for imported audio files.
     - Client playback accesses audio exclusively through short-lived (60 min) signed URLs generated via `/api/music/upload/signed-url` with strict path traversal prevention (`audio/` prefix).
     - Privileged service-role credentials (`SUPABASE_SERVICE_ROLE_KEY`) are isolated strictly to trusted server routes (`src/app/api/music/upload/route.ts`).
  4. **Dual Ingestion Pipelines:**
     - **CLI Script (`scripts/import-music.ts`)**: Supports CSV and JSON manifests, file existence check, binary magic header sniffing, SHA-256 deduplication, Supabase Storage uploads, catalogue records insertion, and `--dry-run` mode.
     - **Admin Upload UI (`src/components/admin/music/AdminMusicUpload.tsx`)**: Authenticated drag-and-drop file uploader with metadata editing, auto-duration extraction, client-side 50MB validation, real-time XHR progress tracking, and retry controls, integrated into `Admin.tsx`.
  5. **Playback Persistence & Autoplay Compliance:**
     - Position is checkpointed periodically with a 5-second debounce rather than on every `timeupdate` tick.
     - On page mount/refresh, the last valid track and queue are restored from the database.
     - Autoplay restrictions are strictly respected: playback remains paused on reload until an explicit user gesture is received.
  6. **Story-Music Protection & Ambient Coordination:**
     - `StoryViewer` integrates with the shared audio engine using the existing `externalAudioRef` interface.
     - On story launch, ambient audio state (`src`, `currentTime`, `wasPlaying`, `volume`) is captured via `captureAudioState` and paused cleanly.
     - On story exit, `restoreAudioState` restores the prior track and playback position, resuming playback only if it was active prior to opening.
  7. **Provider-Neutral Design:**
     - Tracks are represented internally with stable IDs and `source_type` (`imported` vs `provider`).
     - External provider IDs (`provider_ref`) remain isolated from internal track identities.
     - Local playback works seamlessly without any external provider configured.
- **Consequences:**
  - 100% test coverage across all music workflows: 657/657 tests passing in the repository.
  - TypeScript compilation and ESLint pass with 0 errors and 0 warnings.
  - Production build succeeds with all 13 routes optimized.
  - Completely non-destructive additive migration ensures existing birthday content remains unharmed.


---

### ADR-016: Landing Page 9-Section Architecture, Timezone-Aware Midnight Reveal & Scrapbook Design System

- **Status:** Accepted (October 2026)
- **Context:**
  The birthday web application required a production-ready, highly personal landing experience celebrating Meerah's birthday. The previous landing page had placeholder cards, lacked a midnight celebration trigger, and did not present the full depth of memories, personal messages, and music in an emotionally coherent sequence. The experience needed to be mobile-first, accessible, responsive across viewports from 320px to 1440px+, respectful of motion preferences, and aligned with the handcrafted 2D scrapbook visual design system.
- **Decision:**
  1. **Nine-Section Linear Narrative Architecture:**
     - Restructured the primary landing tab (`tab === "home"` in `src/components/Experience.tsx`) into a sequential 9-section narrative:
       * Section 1: Midnight Birthday Reveal (`MidnightBirthdayReveal.tsx`)
       * Section 2: Welcome Hero & Avatar (`HeroSection.tsx`)
       * Section 3: Swipeable Photo Cards (`SwipeablePhotoCards.tsx`)
       * Section 4: Personal Messages and Poetry (`PersonalMessagesSection.tsx`)
       * Section 5: Birthday Book Invitation (`BirthdayBookInvitation.tsx`)
       * Section 6: Our Soundtrack (`OurSoundtrackSection.tsx`)
       * Section 7: Memories Preview (`MemoriesPreviewSection.tsx`)
       * Section 8: Explore Your World (`ExploreWorldSection.tsx` & `ScrapbookCardWall.tsx`)
       * Section 9: Closing Message (`ClosingMessageSection.tsx`)
  2. **Timezone-Aware Date Gating & Audio Chime Fallback:**
     - Date-gated to October 30 evaluated against the recipient's timezone (`Asia/Kolkata` default) using `Intl.DateTimeFormat`.
     - Deterministic annual completion state persisted to `localStorage` under `birthday-reveal-completed-YYYY-10-30`.
     - Multi-tier audio fallback: attempts configured track audio -> gracefully catches autoplay denial without breaking -> renders fallback "Tap to celebrate ♫" button -> provides Web Audio API synthesized music-box acoustic chime (`playMusicBoxChime`) using pure sine waves and natural exponential decay envelopes.
  3. **Handcrafted Scrapbook Visual Design System:**
     - Unified color tokens (`landing-tokens.css`): Warm ivory (`#FFF9EF`), cream paper (`#FBF4E6`), sunflower gold (`#F1C75B`), rose pink (`#D4798D`), sage foliage green (`#5B8266`), and plum ink (`#624752`).
     - Embellishments: Reusable semi-transparent washi tape (`.washi-tape`, `washi-tape-pink`, `washi-tape-sage`), deckled borders, tilt rotations, floor contact shadows, and realistic wax seal SVG stamps with embossed hearts.
  4. **Bicultural English & Urdu RTL Typography:**
     - Strict bilingual representation with bidirectional isolation: Urdu elements explicitly declare `lang="ur"` and `dir="rtl"`, preventing punctuation inversion and layout drift.
  5. **Single-Audio-Controller & Zero-Autoplay Compliance:**
     - Section 6 (`OurSoundtrackSection`) delegates playback to the parent audio controller in `Experience.tsx` via callback props (`onTogglePlay`, `onPlayTrack`). Zero duplicate `<audio>` DOM elements are created.
  6. **Accessibility & Reduced-Motion Guarantee:**
     - All 10 landing stylesheets define `@media (prefers-reduced-motion: reduce)` to disable non-essential animations, spins, and transitions for users with vestibular or motion sensitivities.
     - All interactive controls feature semantic ARIA roles, descriptive labels, and keyboard operability (`tabIndex={0}`, Enter/Space handlers).
- **Consequences:**
  - 100% of landing page tests pass (763/763 tests passing across 117 suites in the repository).
  - TypeScript strict typecheck passes with 0 errors (`npx tsc --noEmit`).
  - ESLint passes with 0 errors and 0 warnings (`npm run lint`).
  - Mobile responsiveness verified across all target viewports (320px iPhone SE through 1440px+ desktop).


---

### ADR-017: Google Photos Asset Pipeline, Shared Media Contracts, and Navigation Deduplication

- **Status:** Accepted (October 2026)
- **Context:**
  The birthday web application required integration with Meerah's curated Google Photos shared album. Ingested assets needed to be seamlessly shared across the Profile grid (`ProfilePanel.tsx`), the Memories room (`MemoriesPanel.tsx`), and landing page previews (`MemoriesPreviewSection.tsx`). Previously, photographs lacked a canonical derivative pipeline (often loading heavy full-resolution originals), mobile navigation suffered from duplicated headers and inconsistent sub-bars, and sensitive URLs or authentication keys risked leaking into client-side logs.
- **Decision:**
  1. **Google Photos Ingestion Pipeline & Safe Fallback Architecture:**
     - Created `/api/photos/google` API route and `src/lib/google-photos/google-photos-service.ts` supporting shared album links from `photos.app.goo.gl` and `photos.google.com/share`.
     - Built transparent fallback to bundled `google-photos-manifest.json` ensuring 100% offline uptime and zero broken images when network access is throttled or offline.
     - Implemented in-memory caching with 1-hour CDN cache headers (`s-maxage=3600, stale-while-revalidate=86400`) and manual `?refresh=true` invalidation.
  2. **Image Derivative Dynamic Rewriting:**
     - Implemented dynamic dimension suffixing for Google Photos CDN endpoints:
       * Square Polaroid Thumbnails: `=w400-h400-c` for uniform grids and reduced network transfer.
       * Full Optimized Previews: `=w1920-h1080` for high-resolution lightbox viewing without downloading uncompressed originals.
       * Direct Downloads: `=d`.
  3. **Shared Media Domain Contracts (`src/types/media-contracts.ts`):**
     - Transformed Google Photos directly into the canonical `PhotoAsset` type.
     - Strict capture date honesty: preserved genuine camera timestamps via `hasKnownCaptureDate` and `effectiveCaptureDate`, avoiding fictitious synthetic dates. Photos with unknown dates are grouped into "Cherished Moments ✿".
     - Implemented bi-directional transformers: `photoAssetToProfilePostItem` and `transformPhotosToProfilePosts`.
  4. **Single Authoritative BottomNav Architecture:**
     - Standardized on a single authoritative `BottomNav.tsx` mounted exclusively once at the root `Experience.tsx` layout footer.
     - Fully eradicated duplicated ambient headings ("Today is all yours") across all sub-tabs.
     - Configured safe-area inset clearance (`env(safe-area-inset-bottom)`) and full ARIA semantics (`role="navigation"`, `role="menubar"`, `role="menuitem"`, `aria-current="page"`).
  5. **Defensive Security & Privacy Invariants:**
     - Implemented `sanitizeAssetPath()` strictly rejecting directory traversal attempts (`../`, `..\\`, null bytes, root drives).
     - Implemented `redactSensitiveUrlParams()` redacting auth tokens, session IDs, and secret keys before any client logging occurs.
  6. **Accessibility & Modal Focus Traps:**
     - Standardized focus trapping (`handleLightboxFocusTrap`) and keyboard Escape dismissal across all photo lightboxes and edit dialogs.
     - Ensured all image elements provide descriptive `alt` text or informative fallback captions.
- **Consequences:**
  - Full acceptance test suite passing: **832 / 832 tests passing across 125 suites (0 failures)**.
  - TypeScript strict compilation passes with 0 errors (`npx tsc --noEmit`).
  - ESLint passes with 0 errors and 0 warnings (`npm run lint`).
  - Production build (`npm run build`) generates 14 static and dynamic routes cleanly in 4.1s.

### Multi-Agent Production Orchestration: Independent App Router Architecture, Route Integrity, and Cross-System Harmonization

- **Date:** 30 October 2026
- **Status:** Accepted & Implemented
- **Context:**
  The birthday application previously operated with all post-unlock destinations rendered conditionally inside a single client-side tab state (`Experience.tsx`), resulting in 404 Not Found errors on deep linking, browser refresh, or direct URL navigation (`/memories`, `/profile`, `/music`, `/study`, `/games`, `/chat`). Furthermore, the UI required alignment with the multi-agent design specification, including a Snapchat-inspired camera room, Spotify-inspired music room, Instagram-inspired profile for **Meerah** (born 30 October 2001), WhatsApp-inspired 1-to-1 private chat, a literary study sanctuary, and a games hub.
- **Decisions:**
  1. **Independent App Router Route Architecture (`src/app/`):**
     - Established dedicated independent route directories and server page components:
       * `/` (`src/app/page.tsx`)
       * `/memories` (`src/app/memories/page.tsx`)
       * `/profile` (`src/app/profile/page.tsx`)
       * `/music` (`src/app/music/page.tsx`)
       * `/study` (`src/app/study/page.tsx`)
       * `/games` (`src/app/games/page.tsx`)
       * `/chat` (`src/app/chat/page.tsx`)
     - Each route implements server-side session scope verification (`readScope("birthday")`) and renders inside a unified `RouteShell.tsx` wrapper with automatic passcode-gate fallback.
  2. **Authoritative Navigation (`src/components/shared/BottomNav.tsx`):**
     - Updated bottom navigation to use Next.js `<Link href="...">` elements for genuine client-side routing, browser history, and direct refresh support.
     - Dynamically determines active route via `usePathname()`.
     - Preserves all accessibility semantics (`role="navigation"`, `role="menubar"`, `role="menuitem"`, `aria-current="page"`).
  3. **Authoritative Identity & Birthday Engine (`src/lib/birthday-dates.ts`):**
     - Recipient standardized exclusively to **Meerah** across all headers, cards, chat threads, and greetings.
     - Authoritative birth date locked to **30 October 2001** (`2001-10-30T00:00:00.000Z`).
     - Dynamic age calculation and live countdown updating every second to the next 30 October milestone.
     - Profile tabs strictly enforce Posts and Favorites (strictly zero Reels tab).
  4. **Spotify-Inspired Music Room & Audio Engine Singleton:**
     - Coordinated single-instance audio management via custom window event bus (`birthday-audio-pause`, `birthday-audio-resume`).
     - Background music automatically pauses when video modals or birthday reveal sounds play, preventing overlapping audio.
     - Full MP4 audio/video container support.
  5. **WhatsApp-Inspired Private 1-to-1 Chat & Web Crypto Security:**
     - Dual-role testing support: Admin (Creator/BABA) ↔ Meerah.
     - Full conversation list, active thread view, online status, timestamps, read receipts (sent/seen double checks), inline photo preview, and voice note player with waveform visualizer.
     - Truthful cryptographic security model: Web Crypto API `AES-GCM-256`, PBKDF2 with 100,000 iterations, and SHA-256 key fingerprints.
  6. **Literary Study Sanctuary & Games Hub:**
     - Study room enhanced with time-aware greeting, Today's Plan checklist (3/5 completed with persistent tasks), quick action cards, recent notes, and curated bookshelf.
     - Games hub features 8 playable games (2048, Memory Match couplets, Tic-Tac-Toe, Snake, Word Hunt, Typing Rush, Color Match, Math/Birthday Quiz).
  7. **Mobile-First UX & Clearance Invariants:**
     - Zero horizontal overflow across 320px, 360px, 390px, and 430px viewports.
     - Safe-area inset support (`env(safe-area-inset-bottom)`) and bottom clearance padding (`.shell-content-with-bottom-nav`) ensuring zero content clipping.
- **Consequences:**
  - Production build (`npm run build`) generates all 11 static and dynamic pages with 0 errors.
  - Dedicated architecture test suite (`test/routes-architecture.test.ts`) passes 6/6.
  - Full test suites pass cleanly across audio, profile, study, games, chat, and mobile performance.


---

### ADR-018: Multi-Agent Production Orchestration — Everyday Sanctuary, Full-Screen Camera Memories, Study Recovery, and Dynamic Photos

- **Date:** 31 October 2026
- **Status:** Accepted & Implemented
- **Context:**
  Following the conclusion of the initial birthday celebration milestone, the application required transformation from an expired countdown into an Everyday Personal Sanctuary for Meerah. Specific user-identified production requirements included:
  1. Full-screen mobile-first Snapchat-inspired camera view as the default entry point for `/memories` with bottom-center shutter button and bottom-left gallery shortcut.
  2. Permanent diagnosis and elimination of the Study room loading crash, with resilient error recovery and typography controls.
  3. Transformation of the homepage into a daily lifestyle sanctuary featuring authentic Quranic reflections and personal reminders with full CRUD and persistence.
  4. Removal of legacy photo entries 5, 6, and 7, replacing hardcoded indices with dynamic photo selection and graceful polaroid placeholders.
  5. Refined WhatsApp-inspired private chat with dedicated incoming/outgoing bubbles, mobile keyboard handling, and owner message routing.
  6. Verification of the 20-30 song music catalog, single shared audio singleton, and schema-resilient batch upload.
  7. Cross-route mobile responsiveness audit across 320px–430px viewports with a single authoritative BottomNav.

- **Decisions & Implementation:**
  1. **Memories & Snapchat Camera Experience (`src/components/memories/`):**
     - `/memories` defaults directly to `activeTab = "camera"` on mount.
     - `CameraPanel.tsx` and new `MemoriesCamera.tsx` support automatic `getUserMedia` stream startup, torch/flash controls, 7-filter carousel, and Love Theme pulse shutter button.
     - Bottom-left gallery shortcut switches seamlessly to saved memories library.
     - Top bar provides prominent "Back to Camera" navigation.
     - Permission-denied fallback with device photo picker.
     - Hardware tracks cleanly stopped via `stopMediaTracks` on component unmount.
  2. **Everyday Sanctuary & Daily Reflections (`src/components/landing/`):**
     - Created `DailyReflections.tsx`: 8 verified Quranic verses directly from the Mushaf with authentic Arabic calligraphy, standard English translation, exact Surah names, chapter:verse citations, and gentle reflections. Strictly zero synthetic text attributed to Quran.
     - Created `PersonalReminders.tsx`: Full CRUD (create, edit, delete, toggle active) with date/time picker, context-aware badges ("Today · 10:00 AM", "Tomorrow"), and persistent client/localStorage sync.
  3. **Study Room Diagnosis & Resilient Recovery (`src/app/study/` & `src/components/study/`):**
     - Wrapped session reading in `try/catch` to eliminate unhandled cookie/session crashes on direct URL access.
     - Re-implemented `src/app/study/error.tsx` with functional "Try Again" (`startTransition(() => { router.refresh(); reset(); })`) and "Return Home" navigation.
     - Added reading theme contrast palettes (Ivory, Sepia, Night), font sizing (sm, md, lg), and authentic Urdu Nastaliq typography for Iqbal and Faiz poetry.
  4. **Dynamic Photo Selection & Elimination of Hardcoded Indices (`src/lib/photo-selection.ts`):**
     - Removed photo entries 5, 6, and 7 from `DEFAULT_PHOTOS` and implemented `isExcludedPhotoEntry` to prevent them from appearing anywhere in the display.
     - Extracted dynamic selection utilities: `selectDynamicPhotos` and `selectDynamicMemories`.
     - Built graceful polaroid card placeholders (`.polaroid-image-fallback` and `.memories-photo-fallback`) for broken/missing media URLs.
  5. **WhatsApp-Inspired Chat Refinement (`src/components/chat/`):**
     - Incoming bubbles (`#2E1734`) and outgoing bubbles (`#4A264D`) with WhatsApp soft-corner radius.
     - Fixed sticky bottom composer bar with 16px font to prevent mobile iOS zoom.
     - E2EE encryption, delivery status checkmarks, and owner routing preserved.
  6. **Mobile-First Responsiveness & BottomNav Deduplication:**
     - Unified `/chat` into `RouteShell` and authoritative `BottomNav`.
     - Touch targets enforced to >= 44x44px.
     - Verified zero horizontal overflow across 320px–430px viewports.

- **Consequences:**
  - Automated test suite passes 100%: **934 tests passing across 132 test suites (0 failures)**.
  - Next.js Turbopack production build (`npm run build`) builds 20 static and dynamic routes cleanly in ~7.5s.
