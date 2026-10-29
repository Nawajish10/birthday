# Landing Page Optimization, Navigation Restructure, Read & Study, Games, and Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Birthday website by restructuring the primary navigation (removing Gifts, promoting Games and Read & Study as first-class tabs), optimizing the 2D scrapbook landing page with 8 active destinations, implementing a rich Read & Study bookshelf, delivering a multi-game Games hub with 3 playable games, replacing Flower Garden with a dedicated Video player experience, and cleanly removing 25 Surprises, Time Capsule, and GIFs without regressions.

**Architecture:** Maintain the single-shell React/Next.js App Router architecture centered on `src/components/Experience.tsx`. Extract new domain features into modular component directories (`src/components/study/`, `src/components/games/`, `src/components/video/`). Preserve all existing design tokens, audio engine persistence, BookCanvas, Profile, Camera, and Eternalus boundaries. Use parallel specialist subagents for isolated feature modules and centralize integration in the Lead Orchestrator.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9, CSS3 (scrapbook design tokens), Node.js v24 native test runner (`node --test`).

**Spec:** Current User Request: Master Multi-Agent Orchestration Prompt (Landing Page Optimization, Navigation Restructure, Read & Study, Games, Video).

## Global Constraints
- Preserve Warm Ivory (`#FFF9EF`), Rose Pink (`#F8E8EC`), Sunflower Gold (`#F1C75B`), Soft Sage (`#E5EDE2`), Plum Ink (`#624752`), and White (`#FFFFFF`).
- Zero autoplay for both music and video.
- All 8 scrapbook destinations on the landing wall must be active and functional (no dead links or 404s).
- Subagents must not modify shared integration files (`Experience.tsx`, `landing-tokens.css`) without explicit assignment.
- All code must pass `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.

## Review Focus
1. Tab switching between Home, Memories, Profile, Songs, Study, Games, and Chat without state resets or audio interruption.
2. Clicking each of the 8 landing page cards routes to the exact intended destination or opens the designated modal/canvas.
3. Read & Study genre filtering updates displayed books smoothly and handles missing reading sources with honest preview states.
4. Games Hub supports playing, tracking score, and resetting each of the 3 playable games (Memory Match, Word Scramble, Birthday Trivia).
5. Video player handles missing video source with a designed scrapbook placeholder state and respects native controls without autoplay.

---

### Task 1: Contracts & Shared Landing Helper Updates (Lead Orchestrator)
**Files:**
- Modify: `src/components/landing/landing-helpers.ts`
- Modify: `src/components/Experience.tsx:17-25`
- Test: `test/landing-card-wall.test.ts`

**Interfaces:**
- Consumes: Existing `ScrapbookDestination` type.
- Produces: Updated `ScrapbookDestination` union (`"birthday-book" | "letter" | "our-memories" | "camera" | "songs" | "study" | "games" | "video"`), updated `SCRAPBOOK_CARDS` array with all 8 active destinations.

- [ ] **Step 1: Write the updated contract tests in `test/landing-card-wall.test.ts`**
  Update `EXPECTED_DESTINATIONS` to reflect the 8 target destinations: `["birthday-book", "letter", "our-memories", "camera", "songs", "study", "games", "video"]`. All 8 are active (`isPlanned: false`).
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test test/landing-card-wall.test.ts`
  Expected: FAIL with missing destinations (`study`, `games`, `video`).
- [ ] **Step 3: Update `src/components/landing/landing-helpers.ts`**
  Add `"study" | "games" | "video" | "camera"` to `ScrapbookDestination`. Remove `"25-surprises" | "flower-garden" | "time-capsule"`. Update `SCRAPBOOK_CARDS` with rich scrapbook metadata for all 8 cards.
- [ ] **Step 4: Update `Tab` union in `Experience.tsx`**
  Change `type Tab = "home" | "profile" | "stories" | "songs" | "study" | "games" | "chat" | "eternalus";`
- [ ] **Step 5: Run tests and verify passing**
  Run: `npm test test/landing-card-wall.test.ts`
  Expected: PASS.

---

### Task 2: Read & Study Experience (Agent B)
**Files:**
- Create: `src/components/study/study-data.ts`
- Create: `src/components/study/StudyPanel.tsx`
- Create: `src/components/study/study.css`
- Test: `test/study.test.ts`

**Interfaces:**
- Consumes: None (isolated module).
- Produces: `StudyPanel` component, `BookItem`, `Genre` types.

- [ ] **Step 1: Write failing unit test in `test/study.test.ts`**
  Tests genre filtering, book search/selection, recommendation rationale, reading modal, and empty state.
- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test test/study.test.ts`
  Expected: FAIL (module not found).
- [ ] **Step 3: Implement `src/components/study/study-data.ts`**
  Define typed books across 6 genres (Literature & Fiction, Romance & Poetry, Mystery & Thriller, Personal Growth, Science & Nature, Urdu Adab). Define editorial recommendations with warm rationales.
- [ ] **Step 4: Implement `src/components/study/StudyPanel.tsx` & `study.css`**
  Build the bookshelf UI, genre pill filters, book detail modal with preview excerpt, and responsive layout.
- [ ] **Step 5: Run tests and verify passing**
  Run: `node --test test/study.test.ts`
  Expected: PASS.

---

### Task 3: Games Experience & Hub (Agent C)
**Files:**
- Create: `src/components/games/game-registry.ts`
- Create: `src/components/games/WordScramble.tsx`
- Create: `src/components/games/BirthdayQuiz.tsx`
- Create: `src/components/games/GamesPanel.tsx`
- Create: `src/components/games/games.css`
- Modify: `src/components/games/MemoryMatch.tsx` (styling integration)
- Test: `test/games.test.ts`

**Interfaces:**
- Consumes: Existing `MemoryMatch.tsx`.
- Produces: `GamesPanel` component, `GameDefinition` registry.

- [ ] **Step 1: Write failing unit test in `test/games.test.ts`**
  Tests game registry (3 games: Memory Match, Word Scramble, Birthday Trivia Quiz), start/restart state machine, score tracking, and completion messages.
- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test test/games.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement `game-registry.ts` & game components**
  Implement Word Scramble (anagram solver with hints) and Birthday Trivia (5 warm celebration questions with score).
- [ ] **Step 4: Implement `GamesPanel.tsx` & `games.css`**
  Build game selector cards, active game frame, score/moves chips, and return-to-hub navigation.
- [ ] **Step 5: Run tests and verify passing**
  Run: `node --test test/games.test.ts`
  Expected: PASS.

---

### Task 4: Video Experience (Agent D)
**Files:**
- Create: `src/components/video/VideoPanel.tsx`
- Create: `src/components/video/video.css`
- Test: `test/video.test.ts`

**Interfaces:**
- Consumes: Optional `videoUrl`, `title`, `description`.
- Produces: `VideoPanel` component.

- [ ] **Step 1: Write failing unit test in `test/video.test.ts`**
  Tests video player rendering, native controls, zero autoplay, custom video URL support, and designed scrapbook placeholder state when video is pending.
- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test test/video.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement `src/components/video/VideoPanel.tsx` & `video.css`**
  Build video card with antique gold frame, filmstrip borders, play indicator, fallback placeholder ("Birthday Video for Meerah"), and responsive player.
- [ ] **Step 4: Run tests and verify passing**
  Run: `node --test test/video.test.ts`
  Expected: PASS.

---

### Task 5: Feature Removal & Cleanup Audit (Agent E)
**Files:**
- Create: `test/cleanup.test.ts`
- Modify: `src/components/landing/ScrapbookCardWall.tsx`
- Modify: `src/components/landing/scrapbook-card-wall.css`

**Interfaces:**
- Consumes: Updated `landing-helpers.ts`.
- Produces: Cleaned card wall with 0 references to 25 Surprises, Time Capsule, Flower Garden, or GIFs.

- [ ] **Step 1: Write failing assertions in `test/cleanup.test.ts`**
  Verify that 25 Surprises, Time Capsule, Flower Garden, and GIFs are absent from active landing wall and main navigation.
- [ ] **Step 2: Update `ScrapbookCardWall.tsx` & `scrapbook-card-wall.css`**
  Update destination rendering, remove planned-card toasts (since all 8 are now active destinations).
- [ ] **Step 3: Run `cleanup.test.ts` to verify passing**
  Run: `node --test test/cleanup.test.ts`
  Expected: PASS.

---

### Task 6: Global Navigation Restructure & Shell Integration (Lead Orchestrator)
**Files:**
- Modify: `src/components/Experience.tsx`
- Modify: `src/app/styles.css` (nav layout)
- Test: `test/integration-acceptance.test.ts`
- Test: `test/landing-integration.test.ts`

**Interfaces:**
- Consumes: `StudyPanel`, `GamesPanel`, `VideoPanel`, updated `ScrapbookCardWall`.
- Produces: Complete integrated application.

- [ ] **Step 1: Update navigation bar in `Experience.tsx`**
  Remove Gift from main navigation. Add Study (`tab === "study"`) and Games (`tab === "games"`).
  Render:
  `[["home", "⌂", "Home"], ["stories", "◎", "Memories"], ["profile", "▦", "Profile"], ["songs", "♫", "Songs"], ["study", "📖", "Study"], ["games", "🎮", "Games"], ["chat", "☏", "Chat"]]`.
- [ ] **Step 2: Wire tabs in `Experience.tsx`**
  - `tab === "study"` renders `<StudyPanel />`.
  - `tab === "games"` renders `<GamesPanel />`.
  - Add video modal/panel state `[showVideo, setShowVideo]` triggered by `"video"` destination card.
  - Wire all 8 landing destination handlers.
- [ ] **Step 3: Run full quality gates**
  Run: `npm test`
  Run: `npx tsc --noEmit`
  Run: `npm run lint`
  Run: `npm run build`
  Expected: All PASS with 0 errors.

---

### Task 7: Independent QA, Documentation & Acceptance (Agent F & Lead)
**Files:**
- Modify: `PRD.md`
- Modify: `flow.md`
- Modify: `decisions.md`
- Modify: `ai-agent.md`

- [ ] **Step 1: Dispatch QA specialist agent to verify responsive layouts, navigation, and accessibility.**
- [ ] **Step 2: Synchronize `PRD.md`, `flow.md`, `decisions.md`, and `ai-agent.md`.**
- [ ] **Step 3: Confirm final verdict and deliver completion report.**

