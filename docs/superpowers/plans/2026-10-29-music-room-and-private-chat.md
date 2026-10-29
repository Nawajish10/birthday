# Implementation Plan: Music Room + Real-Time Private Chat
**Date:** October 29, 2026  
**Repository:** `c:/Users/Afreen/birthday`  
**Lead Architect & Multi-Agent Orchestrator:** Lead Integration Orchestrator

---

## 1. Architectural Baseline & Interfaces

### 1.1 Music Room (`src/components/music/`)
- Reference: `music-panel.html` & `design.md`.
- Theme: Love Theme tokens (`[data-theme="love"]`) using CSS variables (`--color-bg`, `--color-surface`, `--color-primary`, `--font-display`, etc.).
- Catalogue: 50-track data-driven seed library with stable IDs, title, artist, duration, favorite state, and playback availability.
- Features:
  - Featured Now Playing card with 3 size modes: `compact`, `standard`, `expanded` (size changes never reset playback or queue).
  - Pure SVG spinning vinyl platter with album center and romantic floral accents.
  - Progress slider, elapsed/total time, volume slider with mute toggle.
  - Controls: Shuffle, Previous, Play/Pause, Next, Repeat (one/all/off).
  - Search input with debounce and instant matching against title/artist.
  - Filter chips: All Songs, Favourites, Playlists.
  - "Add local songs" file picker using `URL.createObjectURL` with cleanup tracking.
  - Graceful track unavailable notification when a demo track has no audio source.
  - Integration with persistent shell audio engine in `Experience.tsx`.

### 1.2 Private Chat (`src/components/chat/`)
- One-to-one human chat between Creator (Admin) and Recipient (Meerah).
- Architecture:
  - Header: Partner display name ("Together Always ♡" / Recipient), avatar, encryption status pill ("End-to-End Encrypted 🔒").
  - Message Timeline: Date separators, incoming/outgoing bubbles, status indicators (sending, sent, error), timestamp, auto-scroll with older message preservation.
  - Media Composer: Text input, Emoji picker helper, photo attachment preview, video attachment preview, voice note recorder with microphone permission handling, GIF selector, cancellation, and upload progress.
  - End-to-End Encryption (E2EE): Client-side AES-GCM (256-bit) encryption using Web Crypto API (`crypto.subtle`). Messages encrypted before sending and decrypted upon receipt on authorized devices.
  - Realtime: Supabase channel subscription with optimistic updates and fallback polling.

---

## 2. File Ownership & Specialist Agents

| Agent / Workstream | Assigned Files | Responsibilities |
| :--- | :--- | :--- |
| **Agent 1 (Architect / Lead)** | `docs/superpowers/plans/*`, `Experience.tsx` integration, Documentation | Protocol definition, integration, quality gates |
| **Agent 2 (Music Room Specialist)** | `src/components/music/music-catalogue.ts`, `MusicRoom.tsx`, `music-room.css`, `test/music-room.test.ts` | 50-song catalogue, player UI, 3 card sizes, search/filter, local audio |
| **Agent 3 (Chat UI Specialist)** | `src/components/chat/ChatPanel.tsx`, `ChatTimeline.tsx`, `ChatComposer.tsx`, `chat.css`, `test/chat-ui.test.ts` | Timeline, composer, voice recorder, media previews, responsive layouts |
| **Agent 4 (Realtime, Storage & Security)**| `src/components/chat/chat-crypto.ts`, `src/lib/chat-service.ts`, `supabase/migrations/202610290001_chat_media_e2ee.sql`, `test/chat-crypto.test.ts` | Web Crypto AES-GCM protocol, key lifecycle, attachments, backend migration |
| **Agent 5 (QA & Mobile Specialist)** | `test/music-chat-integration.test.ts`, verification audits | Responsive checks (360px-1440px), accessibility, contrast, tests |

---

## 3. Tasks Breakdown

- **Task 1: Theme Tokens & Architecture Contracts (Lead Orchestrator)**
  - Ensure `[data-theme="love"]` tokens from `design.md` are accessible in `src/app/styles.css` / theme tokens.
- **Task 2: Agent 2 — Music Room Implementation**
  - Implement `src/components/music/music-catalogue.ts` with 50 tracks and state helpers.
  - Implement `src/components/music/MusicRoom.tsx` & `music-room.css`.
  - Write and pass `test/music-room.test.ts`.
- **Task 3: Agent 4 — Realtime, Storage & E2EE Crypto Engine**
  - Implement `src/components/chat/chat-crypto.ts` (AES-GCM-256 Web Crypto API protocol).
  - Create Supabase migration `supabase/migrations/202610290001_chat_media_e2ee.sql`.
  - Implement `src/lib/chat-service.ts` for real-time delivery and encrypted media.
  - Write and pass `test/chat-crypto.test.ts`.
- **Task 4: Agent 3 — Private Chat UI & Composer Implementation**
  - Implement `ChatTimeline.tsx`, `ChatComposer.tsx`, `ChatPanel.tsx`, `chat.css`.
  - Wire media attachments, voice recording with duration tracking, GIF picker.
  - Write and pass `test/chat-ui.test.ts`.
- **Task 5: Shell Wiring & Integration (Lead Orchestrator)**
  - Integrate `MusicRoom` into `tab === "songs"` in `Experience.tsx`.
  - Replace legacy chat/Noah in `tab === "chat"` with the new `ChatPanel` (pure 1-to-1 human chat).
- **Task 6: Agent 5 — Comprehensive Integration, Mobile & Accessibility Verification**
  - Write `test/music-chat-integration.test.ts`.
  - Verify all quality gates: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- **Task 7: Documentation & Final Delivery Report**
  - Update `PRD.md`, `flow.md`, `decisions.md` (ADR-008), `ai-agent.md`.

