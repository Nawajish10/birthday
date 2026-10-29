# Profile, Memories, Music, Photo Creation, and Mobile-First UX Implementation Plan

**Feature Name:** Profile, Memories, Music, Photo Creation, and Mobile-First UX  
**Working Mode:** Multi-Agent Orchestration & Parallel Implementation  
**Target Repository:** `c:/Users/Afreen/birthday`  
**Date:** 2026-10-29  

---

## 1. Executive Summary & Architecture Map

This plan delivers the complete **Profile** (Instagram-inspired), **Memories** (Snapchat-inspired), **Photo Ingestion Pipeline**, **User Collections & Highlights**, and **Music-Story Integration** into the existing Birthday application.

The implementation preserves the existing landing page, music room, games, study, and video experiences while replacing legacy prototype stubs with fully-tested, persistent, mobile-first components.

```
                           ┌─────────────────────────────────────────┐
                           │      Lead Orchestrator (Agent 0)        │
                           │     Architecture, State, Integration    │
                           └────────────────────┬────────────────────┘
             ┌─────────────────────┬────────────┴────────────┬─────────────────────┐
             ▼                     ▼                         ▼                     ▼
      ┌─────────────┐       ┌─────────────┐           ┌─────────────┐       ┌─────────────┐
      │   Agent 1   │       │   Agent 2   │           │   Agent 3   │       │   Agent 4   │
      │  Contracts  │       │   Profile   │           │  Memories   │       │Photo Ingest │
      │   & Dates   │       │ & Identity  │           │ & Timeline  │       │  & Camera   │
      └──────┬──────┘       └──────┬──────┘           └──────┬──────┘       └──────┬──────┘
             │                     │                         │                     │
             ├─────────────────────┼─────────────────────────┼─────────────────────┤
             ▼                     ▼                         ▼                     ▼
      ┌─────────────┐       ┌─────────────┐           ┌─────────────┐       ┌─────────────┐
      │   Agent 5   │       │   Agent 6   │           │   Agent 7   │       │   Agent 8   │
      │  Stories &  │       │ Music/Audio │           │ Mobile-First│       │Persistence  │
      │ Collections │       │ Integration │           │UX Specialist│       │ & Security  │
      └──────┬──────┘       └──────┬──────┘           └──────┬──────┘       └──────┬──────┘
             │                     │                         │                     │
             └─────────────────────┼─────────────────────────┼─────────────────────┘
                                   ▼
                       ┌──────────────────────┐
                       │     Agent 9 & 10     │
                       │ E2E QA & Docs Sync   │
                       └──────────────────────┘
```

---

## 2. File Ownership Boundaries

| Agent | Bounded File Ownership | Prohibited Edits |
| :--- | :--- | :--- |
| **Agent 1: Contracts & Dates** | `src/types/media-contracts.ts`, `src/lib/birthday-dates.ts`, `test/birthday-dates.test.ts` | UI components, `Experience.tsx` |
| **Agent 2: Profile & Identity** | `src/components/profile/*`, `test/profile.test.ts`, `test/profile-e2e.test.ts` | Memories, Camera, `Experience.tsx` |
| **Agent 3: Memories & Timeline** | `src/components/memories/MemoriesPanel.tsx`, `memories.css`, `test/memories-e2e.test.ts` | Profile, Audio engine, `Experience.tsx` |
| **Agent 4: Photo Ingestion & Camera**| `src/components/camera/*`, `test/camera.test.ts`, `test/photo-lifecycle.test.ts` | Music, Profile, `Experience.tsx` |
| **Agent 5: Stories & Collections** | `src/components/memories/StoryViewer.tsx`, `src/components/memories/story-helpers.ts` | Audio engine, `Experience.tsx` |
| **Agent 6: Music & Story Audio** | `src/components/music/story-audio-bridge.ts`, audio playback coordination in StoryViewer | Audio singleton duplication |
| **Agent 7: Mobile UX Specialist** | `profile.css`, `memories.css`, `camera.css` responsive reviews, `test/mobile-regression.test.ts` | Business logic, DB operations |
| **Agent 8: Persistence & Security**| `src/lib/media-service.ts`, `supabase/migrations/202610290002_profile_memories_collections.sql` | UI presentation layers |
| **Agent 9: QA & End-to-End** | `test/journeys-a-i.test.ts`, test runner suites | Product code files |
| **Agent 10: Documentation** | `PRD.md`, `flow.md`, `decisions.md` (ADR-009), `ai-agent.md`, `design.md` | Code files |
| **Lead Orchestrator (Agent 0)** | `src/components/Experience.tsx`, shared tokens integration | Subagent isolated files during implementation |

---

## 3. Phased Implementation Tasks

### Task 1: Shared Contracts & Authoritative Date Engine (Agent 1)
- Create `src/types/media-contracts.ts` with `PhotoAsset`, `ProfileData`, `ProfilePost`, `FavoriteItem`, `HighlightCollection`, `AlbumCollection`, `StoryItem`.
- Create `src/lib/birthday-dates.ts` with `calculateAge`, `calculateNextBirthdayCountdown`, leap-year handling (Feb 29 $\rightarrow$ Feb 28 in non-leap years), `isOnThisDay`, and `groupPhotosByCaptureYear`.
- Write `test/birthday-dates.test.ts` covering normal birthdays, leap years, boundary months, and On This Day matching.
- **Verification:** `node --test test/birthday-dates.test.ts` passes 100%.

### Task 2: Persistence, Storage & Security Service (Agent 8)
- Create Supabase migration `supabase/migrations/202610290002_profile_memories_collections.sql`.
- Create `src/lib/media-service.ts` managing profile data, photo assets, favorites, highlights, albums, and stories with local storage caching and Supabase synchronization.
- Implement compensating cleanup: deleting photo assets cleans up collection references; deleting collections leaves photo assets intact.
- **Verification:** `node --test test/media-service.test.ts` passes 100%.

### Task 3: Profile Experience & Identity Modal (Agent 2)
- Refactor `src/components/profile/ProfilePanel.tsx` to display dynamic age and birthday countdown using `birthday-dates.ts`.
- Add Profile Edit Modal allowing authorized editing of display name, bio, avatar, and interests.
- Support Highlights carousel with "New Highlight" modal, cover selection, and photo membership.
- Update `profile.css` with mobile-first Instagram styling adhering to `[data-theme="love"]`.
- **Verification:** `node --test test/profile.test.ts` and `node --test test/profile-e2e.test.ts` pass.

### Task 4: Photo Ingestion, Camera & Validation Pipeline (Agent 4)
- Enhance `src/components/camera/CameraPanel.tsx` and create `PhotoUploadModal.tsx`.
- Implement device upload + live mobile camera capture with track stop cleanup.
- File validation (size $\le 12\text{ MB}$, allowed MIME types).
- Preview modal with aspect ratio verification, caption entry, and effective capture date picker.
- **Verification:** `node --test test/photo-lifecycle.test.ts` passes.

### Task 5: Memories Timeline, "On This Day" & Photo Lightbox (Agent 3)
- Create `src/components/memories/MemoriesPanel.tsx` and `memories.css`.
- Implement 4 tabs: "All Photos", "On This Day", "Stories", "Albums".
- Chronological timeline grouping photos by Year and Month.
- "On This Day" discovery matching today's date across previous years using effective capture date.
- Full-screen photo lightbox with caption, metadata, favorite button, and scroll position restoration.
- **Verification:** `node --test test/memories-e2e.test.ts` passes.

### Task 6: Stories Builder & Music-Audio Integration (Agents 5 & 6)
- Create `src/components/memories/StoryViewer.tsx` supporting curated photo sequences, slide timers, pause-on-press, and tap navigation.
- Implement background music selection from the 50-song curated catalogue (`music-catalogue.ts`).
- Connect story playback to shell's `<audio ref={playerRef}>` (zero duplicate audio elements).
- Story audio stops cleanly when story modal closes; story remains usable if audio is muted or blocked.
- **Verification:** `node --test test/story-music.test.ts` passes.

### Task 7: Shell Integration in `Experience.tsx` (Lead Orchestrator)
- Mount `ProfilePanel` in `tab === "profile"` with full state synchronization.
- Mount `MemoriesPanel` in `tab === "stories"` replacing legacy slider while connecting photo capture.
- Wire audio callbacks and shared favorites between Profile, Memories, and Music Room.
- **Verification:** `npm test`, `npx tsc --noEmit`, `npm run lint`.

### Task 8: Mobile-First UX Audit & Accessibility (Agent 7)
- Verify responsive layout at 320px, 360px, 390px, 430px, 768px, 1024px, 1440px.
- Audit touch targets ($\ge 44\times 44\text{px}$), safe-area insets, keyboard-avoidance, reduced motion.
- Write `test/mobile-regression.test.ts`.

### Task 9: End-to-End Verification of Journeys A–I (Agent 9)
- Write and run `test/journeys-a-i.test.ts` covering:
  - Journey A: Profile initialization, age, countdown, bio, highlights
  - Journey B: Upload & publish photo lifecycle
  - Journey C: Mobile camera capture & date validation
  - Journey D: Favorites toggle & persistence across reload
  - Journey E: Highlights & albums creation/editing/safe deletion
  - Journey F: On This Day discovery with effective capture date
  - Journey G: Story with music & zero duplicate audio
  - Journey H: Authorization & negative authorization
  - Journey I: Mobile regression across all viewports

### Task 10: Documentation Synchronization (Agent 10)
- Update `PRD.md`, `flow.md`, `ai-agent.md`, `decisions.md` (ADR-009).
- Prepare final release-readiness report.

