# Birthday Website Redesign & Feature Completion — Master Implementation Plan

> **Goal:** Deliver a production-quality, cohesive release of the Birthday website featuring the Love Theme visual brand system, a Snapchat-inspired camera-first Memories experience, fully functional E2EE private chat, expanded Study experience with 12 genres and 8 presentation templates, an expanded solo and real-time multiplayer Games hub, and verified quality gates.

---

## Architecture & Workstream Overview

```
                                  ┌────────────────────────────────────────┐
                                  │      Agent 0: Lead Orchestrator        │
                                  │ (Architecture, Integration, Gates)    │
                                  └───────────────────┬────────────────────┘
         ┌──────────────────┬─────────────────────────┼─────────────────────────┬──────────────────┐
         ▼                  ▼                         ▼                         ▼                  ▼
┌─────────────────┐ ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ ┌─────────────────┐
│     Agent 1     │ │     Agent 2     │     │     Agent 3     │     │     Agent 4     │ │     Agent 5     │
│  Brand Theme &  │ │Memories & Camera│     │  Private Chat   │     │  Reading & Study│ │ Expanded Games  │
│  Global CSS UI  │ │ (Default Camera,│     │ (E2EE, Polling, │     │  (12 Genres, 8  │ │(Solo, Rooms,    │
│ (Love Theme,    │ │ Filters, Gallery│     │ Attachments,    │     │   Templates,    │ │ Multiplayer     │
│  Dark Plum,     │ │ Notifications)  │     │ Offline Queue)  │     │   Progress)     │ │ Connect4, Trivia│
│  Responsive)    │ │                 │     │                 │     │                 │ │ Escape Room)    │
└────────┬────────┘ └────────┬────────┘     └────────┬────────┘     └────────┬────────┘ └────────┬────────┘
         │                  │                         │                         │                  │
         └──────────────────┴─────────────────────────┼─────────────────────────┴──────────────────┘
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │    Agent 6: QA Reviewer     │
                                       │ (Test Suites, Verification, │
                                       │  Build, Lint, Doc Sync)     │
                                       └─────────────────────────────┘
```

---

## Disjoint File Ownership Matrix

| Workstream / Agent | Allowed Files | Forbidden Files |
| :--- | :--- | :--- |
| **Agent 1: Brand & UI** | `src/app/styles.css`, `src/app/layout.tsx`, `src/components/landing/landing-tokens.css`, `test/theme-brand-system.test.ts` | `ChatPanel.tsx`, `GamesPanel.tsx`, `StudyPanel.tsx` |
| **Agent 2: Memories & Camera**| `src/components/memories/*`, `src/components/camera/*`, `test/camera-snapchat-ui.test.ts`, `test/memories-camera-default.test.ts` | `src/app/styles.css`, `src/components/games/*` |
| **Agent 3: Private Chat** | `src/components/chat/*`, `src/lib/chat-service.ts`, `test/chat-e2e-delivery.test.ts` | `src/components/games/*`, `src/components/study/*` |
| **Agent 4: Reading & Study**| `src/components/study/*`, `test/study-templates-genres.test.ts` | `src/components/chat/*`, `src/components/camera/*` |
| **Agent 5: Games Hub** | `src/components/games/*`, `test/games-expanded-multiplayer.test.ts` | `src/components/study/*`, `src/components/chat/*` |
| **Agent 0: Lead Orchestrator**| `src/components/Experience.tsx`, Documentation (`PRD.md`, `flow.md`, `decisions.md`, `ai-agent.md`) | Subagent active files |

---

## Task List

### Task 1: Brand System & Global Responsive Love Theme (Agent 1)
- **Files:** `src/app/layout.tsx`, `src/app/styles.css`, `test/theme-brand-system.test.ts`
- **Objective:**
  - Apply `data-theme="love"` root styling across the website.
  - Implement the canonical palette: Deep Plum (`#1A0F1F`), Dark Purple (`#26132B`), Elevated Plum (`#3A1F3B`), Soft Pink (`#F7A8B8`), Strong Pink (`#F27A98`), Warm Gold (`#D4A47C`).
  - Replace the plain white/cream default appearance with rich, warm, romantic dark plum surfaces while preserving restrained light surfaces where reading/photography demands it.
  - Ensure responsive layout from 360px up to 1440px with touch targets $\ge 44\times 44\text{px}$ and safe area bottom insets.
- **Verification:** `node --test test/theme-brand-system.test.ts`

### Task 2: Memories & Moments Snapchat-Inspired Camera Experience (Agent 2)
- **Files:** `src/components/memories/MemoriesPanel.tsx`, `src/components/camera/CameraPanel.tsx`, `src/components/camera/camera-pipeline.ts`, `src/components/camera/camera.css`, `src/components/memories/memories.css`, `test/camera-snapchat-ui.test.ts`, `test/memories-camera-default.test.ts`
- **Objective:**
  - Make the Camera experience the **default active view** when opening Memories (`activeTab = "camera"`).
  - Implement the Snapchat-inspired layout:
    - Center live preview occupying primary mobile screen.
    - Bottom prominent shutter button.
    - Horizontal scrollable filter & effect selector (Natural, Warm Sun, Soft Rose, Vintage Film, Cinematic Plum, Golden Hour).
    - Left-edge overlay shortcut leading to saved photos & videos gallery with thumbnail count.
    - Top area: flash/torch control (where supported), camera flip (front/back), capture status badge.
    - In-app notification bell and notifications panel for capture completion, upload status, and permission alerts.
  - Media library: Grid layout, full-screen media preview, chronological grouping, persistent storage.
- **Verification:** `node --test test/camera-snapchat-ui.test.ts` and `node --test test/memories-camera-default.test.ts`

### Task 3: Private Chat End-to-End Functionality (Agent 3)
- **Files:** `src/components/chat/ChatPanel.tsx`, `src/components/chat/ChatComposer.tsx`, `src/components/chat/ChatTimeline.tsx`, `src/lib/chat-service.ts`, `src/components/chat/chat-crypto.ts`, `test/chat-e2e-delivery.test.ts`
- **Objective:**
  - Implement full E2EE encryption on outgoing messages and decryption on incoming messages with PBKDF2/AES-GCM-256.
  - Add offline message queueing via localStorage (`birthday-offline-chat-queue`) and auto-delivery upon reconnect with duplicate message prevention.
  - Background polling synchronization every 3 seconds to fetch new messages and update timeline.
  - Support rich media attachments (photos, videos, GIFs, voice notes) with size validation and preview.
  - Preserve strict Zero-AI policy (purely 1-to-1 human messaging).
- **Verification:** `node --test test/chat-e2e-delivery.test.ts`

### Task 4: Reading and Study Experience (Agent 4)
- **Files:** `src/components/study/study-data.ts`, `src/components/study/StudyPanel.tsx`, `src/components/study/study.css`, `test/study-templates-genres.test.ts`
- **Objective:**
  - Add 12 genres: Fiction, Romance, Mystery & Thriller, Fantasy, Science Fiction, Biography, Self-Development, History & Philosophy, Manga, Anime-Inspired Stories, Comics & Graphic Novels, Short Stories & Poetry.
  - Add 8 reading templates:
    1. Minimal Distraction-Free
    2. Romantic Literary Journal
    3. Manga-Inspired Panel Layout
    4. Anime-Inspired Illustrated Story
    5. Graphic Novel Layout
    6. Book-Cover & Bookshelf
    7. Notes & Highlights Workspace
    8. Study Cards & Chapter Summaries
  - Include genuine reading excerpts, chapter progression, reading position persistence, and bookmarking.
- **Verification:** `node --test test/study-templates-genres.test.ts`

### Task 5: Expanded Solo and Real-Time Multiplayer Games (Agent 5)
- **Files:** `src/components/games/game-registry.ts`, `src/components/games/multiplayer-service.ts`, `src/components/games/ConnectFour.tsx`, `src/components/games/TriviaDuel.tsx`, `src/components/games/DailyWordPuzzle.tsx`, `src/components/games/EscapeRoomPuzzle.tsx`, `src/components/games/WouldYouRather.tsx`, `src/components/games/GamesPanel.tsx`, `src/components/games/games.css`, `test/games-expanded-multiplayer.test.ts`
- **Objective:**
  - Build balanced collection across:
    - **Competitive:** Trivia Duel, Word Battle, Connect Four.
    - **Cooperative:** Cooperative Escape Room, Shared Memory Challenge.
    - **Social & Party:** Would You Rather, Truth or Dare.
    - **Solo:** Daily Word Puzzle, Solo Trivia Challenge, Memory Match, Escape Room Puzzle.
  - Solo play: Direct launch, local state machine or bot, win/loss, restarts, score persistence.
  - Multiplayer room management (`multiplayer-service.ts`):
    - Create private room with 6-character room code.
    - Join/leave room, participant roster, host status.
    - Real-time turn, move, score, and state synchronization across sessions.
    - Disconnect/reconnect handling and clean room departure.
- **Verification:** `node --test test/games-expanded-multiplayer.test.ts`

### Task 6: Shell Integration, Quality Gates & Final Acceptance (Agent 0 & Agent 6)
- **Files:** `src/components/Experience.tsx`, `PRD.md`, `flow.md`, `decisions.md` (ADR-010), `ai-agent.md`
- **Objective:**
  - Integrate all workstreams cleanly into `Experience.tsx`.
  - Execute full test suite: `npm test` (all tests passing).
  - Execute TypeScript static check: `npx tsc --noEmit` (0 errors).
  - Execute ESLint audit: `npm run lint` (0 errors, 0 warnings).
  - Execute Next.js build: `npm run build` (exit code 0).
  - Update all documentation and produce the final engineering report.

