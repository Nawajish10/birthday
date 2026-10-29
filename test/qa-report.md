# Quality Assurance & Integration Review Report

**Project:** Meerah Birthday Experience  
**Date:** October 28, 2026  
**Auditor / Reviewer:** Agent 3 (QA and Integration Reviewer)  
**Status:** **PASSED** (20 / 20 Integration Acceptance Tests Passing; 24 / 24 Total Suite Passing)  
**Test Suite:** `test/integration-acceptance.test.ts`  

---

## 1. Executive Summary & Scope

This QA and Integration Review evaluates the contracts, safety guarantees, and user experience requirements for the **Profile** and **Camera/Stories** features of the Meerah Birthday Experience as defined in `PRD.md`, `src/components/Experience.tsx`, `src/lib/types.ts`, and `src/app/api/captures/route.ts`.

Key focus areas included:
1. **Profile Contract:** Multi-mode filtering (Posts, Reels, Favorites), mutable favorite toggle semantics, empty states, and external URL sanitation.
2. **Camera Contract:** Capture consent workflows, payload compliance with `/api/captures` (size limits, allowed MIME types), MediaStream track cleanup, and hardware error resilience.
3. **Integration Contract:** Type alignment with `Payload.posts` and `data.stories` passed from `Experience.tsx`.
4. **Security & Privacy Boundary:** Preservation of device-only capture consent, strict exclusion of biometric data leaks, and enforcement of the isolation boundary separating the birthday experience from the private **Eternalus** vault.

---

## 2. Shared Dependencies & Integration Contracts

### 2.1 Profile Panel Integration Contract

The Profile view functions as an Instagram-inspired gallery celebrating Meerah.

```typescript
export type DecoratedPost = Post & { url: string };
export type ProfileMode = "posts" | "reels" | "favorites";

export interface ProfilePanelContract {
  /** Array of posts loaded by Experience.tsx */
  posts: DecoratedPost[];
  /** Active profile tab mode */
  profileMode: ProfileMode;
  /** Array of post IDs favorited by the visitor */
  favorites: string[];
  /** Loading state indicator */
  isLoading?: boolean;
  /** Optional creator or external Instagram profile link */
  externalInstagramUrl?: string | null;
  /** Callback when user clicks a media tile to open full viewer */
  onSelectMedia?: (media: { url: string; caption: string; kind?: "image" | "video" }) => void;
  /** Callback when user toggles the favorite status of a post */
  onToggleFavorite?: (id: string) => void;
  /** Callback to navigate to the Eternalus vault entry card */
  onOpenEternalus?: () => void;
}
```

#### Contract Rules for Profile:
1. **Posts Tab:** Shows all posts where `media_kind !== "video"` (images only).
2. **Reels Tab:** Shows all posts where `media_kind === "video"`.
3. **Favorites Tab:** Shows all posts where `favorites.includes(post.id)`, preserving list order.
4. **Favorites Storage:** Stored in `localStorage["birthday-favorites"]` as a JSON string array. Must parse safely without crashing if corrupted.
5. **External Link Safety:** External URLs must only use `https:` or `http:` schemes; dangerous schemes (`javascript:`, `data:`, `vbscript:`, `file:`) must be rejected.

---

### 2.2 Camera Panel Integration Contract

The Camera view enables the visitor to view preloaded memories and capture their own birthday photo.

```typescript
export type DecoratedStory = Story & { url: string };

export interface CameraPanelContract {
  /** Array of preloaded birthday memories/stories */
  stories: DecoratedStory[];
  /** Current active capture data URL (if any) */
  capture?: string;
  /** Camera stream state */
  isStreaming?: boolean;
  /** Error message if camera access or upload fails */
  error?: string;
  /** Callback when photo is captured */
  onCapture?: (dataUrl: string) => void;
  /** Callback when user cancels or retakes a captured photo */
  onClearCapture?: () => void;
  /** Callback to upload captured photo to birthday profile */
  onAddToProfile?: (dataUrl: string, caption?: string) => Promise<void>;
  /** Callback for error reporting */
  onError?: (message: string) => void;
}
```

#### Contract Rules for Camera:
1. **Consent Gate:** Photo capture operates strictly on-device in browser memory. No network request is initiated when capturing, previewing, retaking, or downloading to device.
2. **Upload Gate:** Network upload (`POST /api/captures`) occurs *only* upon deliberate user invocation of the "Add to profile" button.
3. **Hardware Lifecycle:** All active `MediaStreamTrack` instances must be cleanly terminated (`track.stop()`) immediately after a photo is taken or when leaving the camera view.
4. **Payload Constraints:** Enforced strictly against `/api/captures`:
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`.
   - File size: Minimum 1 byte, maximum 12 MB ($12 \times 1024 \times 1024$ bytes).
   - Caption: Truncated to 280 characters.

---

## 3. Comprehensive Verification Matrix

| Area | Requirement / Specification | Test Name in `test/integration-acceptance.test.ts` | Result |
| :--- | :--- | :--- | :---: |
| **Profile** | Posts filter excludes all video items | `Posts filter excludes videos and retains only images/photos` | **PASS** |
| **Profile** | Reels filter includes only video items | `Reels filter includes only videos` | **PASS** |
| **Profile** | Favorites filter matches favorited item IDs | `Favorites filter matches favorited item IDs (including both photos and reels if favorited)` | **PASS** |
| **Profile** | Favorite toggle adds new IDs & removes existing IDs | `Favorite toggle adds new IDs and removes existing IDs (immutable transition)` | **PASS** |
| **Profile** | Resilient parsing of local storage favorites | `Favorites storage resilience: handles valid arrays, malformed JSON, and non-array types` | **PASS** |
| **Profile** | Empty state handling for 0 items | `Empty states handle 0 items correctly with proper user guidance messages` | **PASS** |
| **Profile** | Safe external Instagram URL protocol check | `External Instagram URL handling: safe protocol check and dangerous protocol rejection` | **PASS** |
| **Camera** | Payload compliance with `/api/captures` (JPEG, PNG, WebP, AVIF) | `Payload verification against /api/captures constraints: accepts valid formats within 12MB` | **PASS** |
| **Camera** | Rejection of disallowed MIME types (GIF, text, video, SVG) | `Payload rejection: rejects disallowed MIME types (text/plain, image/gif, video/mp4, image/svg+xml)` | **PASS** |
| **Camera** | Rejection of oversized (>12MB) and zero-byte files | `Payload rejection: rejects oversized files (>12MB) and zero-byte files (<1 byte)` | **PASS** |
| **Camera** | Caption length truncation at 280 characters | `Payload validation: caption length slicing enforces 280-character limit` | **PASS** |
| **Camera** | On-device consent: no network traffic without upload action | `Consent check: captured photo preview remains strictly local until explicit user upload action` | **PASS** |
| **Camera** | Hardware cleanup: releases all active stream tracks | `Track cleanup contract: releases all MediaStream tracks when photo is captured or closed` | **PASS** |
| **Camera** | Camera denial fallback: friendly message & non-blocking navigation | `Camera denial resilience: handles permission denial with informative fallback message and non-blocking navigation` | **PASS** |
| **Integration** | `Payload.posts` shape matches `Post & { url: string }` | `Data contract: Payload.posts conforms to (Post & { url: string }) specification` | **PASS** |
| **Integration** | `Payload.stories` shape matches `Story & { url: string }` | `Data contract: Payload.stories conforms to (Story & { url: string }) specification` | **PASS** |
| **Integration** | `ProfilePanel` contract aligns with `Experience.tsx` | `Component contract: ProfilePanel interface contract fulfills Experience.tsx expectations` | **PASS** |
| **Integration** | `CameraPanel` contract aligns with `Experience.tsx` | `Component contract: CameraPanel interface contract fulfills Experience.tsx expectations` | **PASS** |
| **Security** | Isolation boundary between Birthday Experience and Eternalus | `Privacy & security boundary: birthday captures do not cross into Eternalus vault boundary` | **PASS** |
| **Security** | Zero biometric/facial descriptor generation on capture | `Privacy & security boundary: no biometric data or facial embeddings are generated or stored on capture` | **PASS** |

---

## 4. Edge Case Analysis

### 4.1 Mobile Viewport Compatibility
* **Touch Target Compliance:** Action buttons (Retake, Save to device, Add to profile, Favorite heart toggle) must maintain a minimum touch target of $44 \times 44\text{ px}$.
* **Inline Video Playback:** All `<video>` tags in reels and stories must specify `playsInline` and `muted` (for previews) to prevent iOS WebKit from forcing fullscreen system player takeover.
* **Aspect Ratio Preservation:** Media grids should use CSS `aspect-ratio: 1/1` or `object-fit: cover` to maintain grid rhythm across varying mobile screen widths (360px to 430px).

### 4.2 Camera Hardware Denial & Unavailability
* **Scenario:** The user blocks browser camera permissions, or the hardware camera is occupied by another application.
* **Expected Behavior:** An informative banner is rendered:  
  `"Camera permission was not granted or a camera is unavailable. You can still view the birthday stories."`
* **Integrity Guarantee:** Navigating stories, viewing the keepsake book, playing music, and browsing the profile remains 100% accessible. An HTML file picker fallback (`<input type="file" accept="image/*" capture="user">`) is provided so mobile users can still choose a photo from their photo library without live camera permission.

### 4.3 Empty Dataset Handling
* **Scenario:** A newly initialized birthday instance has 0 posts, 0 reels, or 0 favorites.
* **Integrity Guarantee:** The gallery renders friendly, contextual placeholders:
  - Posts mode: `"Your birthday photos will appear here once the creator adds them."`
  - Reels mode: `"No reels yet. Add videos in the creator workspace."`
  - Favorites mode: `"Tap the heart on a post or reel to save it here."`
* Filtering operations on empty arrays safely return `[]` without triggering `undefined` index access errors.

### 4.4 Local Storage Corruption Resilience & Key Compatibility
* **Scenario:** `localStorage["birthday-favorites"]` contains corrupted data (e.g. truncated JSON string `"[\"post-1\", "`, non-array JSON `'{"id":"1"}'`, boolean values, or null).
* **Integrity Guarantee:** `parseStoredFavorites()` safely wraps `JSON.parse` in a `try/catch` and validates that the parsed output is a true array of strings (`Array.isArray(parsed) && parsed.every(x => typeof x === "string")`). If malformed, it seamlessly defaults to `[]` without disrupting application rendering.
* **Storage Key Standardization Finding:**
  - `Experience.tsx` accesses `localStorage.getItem("birthday-favorites")` (hyphenated).
  - Standalone `ProfilePanel.tsx` defines `FAVORITES_STORAGE_KEY = "birthday_favorites"` (underscore).
  - **Resolution / Recommendation:** In `resolveStoredFavorites()`, fall back across both keys: `localStorage.getItem("birthday-favorites") || localStorage.getItem("birthday_favorites")`. When persisting in `Experience.tsx`, write to both or keep `birthday-favorites` as canonical to avoid losing favorites when swapping components.

---

## 5. Security & Privacy Audit

### 5.1 Zero Biometric Data Leak
* **Finding:** The camera capture feature in the main birthday experience is designed strictly for commemorative photo capture.
* **Verification:** The `/api/captures` endpoint and client camera component do not execute facial recognition, facial landmark detection, or vector embedding generation.
* **Boundary:** Biometric face verification is isolated strictly to the **Eternalus** vault unlocking sequence (`/api/eternalus/auth`) and is never loaded or executed during general birthday photo capture.

### 5.2 Preservation of Camera Consent
* **Finding:** Privacy expectations from `PRD.md` Principle 4 ("Privacy is understandable") and Principle 3 ("The recipient stays in control") are rigorously upheld.
* **Verification:**
  1. The camera stream is never started automatically on page load. It requires an explicit user gesture ("Open camera").
  2. Captured photos reside exclusively in browser memory (as Canvas data URLs) until the user explicitly selects "Add to profile".
  3. "Save to device" initiates a browser download without transmitting data over the network.
  4. "Retake" discards the photo buffer immediately.

### 5.3 Eternalus Vault Boundary Intact
* **Finding:** The separation between public birthday content and private Eternalus memories is physically and logically maintained.
* **Verification:**
  - Storage bucket for birthday captures: `birthday-public` under path `recipient/${visitor}/...`.
  - Storage bucket for Eternalus vault: `eternalus-private` under path `vault/...`.
  - Session scope: Access to `/api/captures` requires `birthday` scope; access to `/api/eternalus` requires `eternalus` scope.
  - The AI companion Noah explicitly operates under instructions stating he cannot see camera captures or Eternalus assets (`PRD.md §2.8`).

---

## 6. Recommendations for Implementation Review

1. **Component Extraction:** When modularizing `ProfilePanel.tsx` and `CameraPanel.tsx` from `Experience.tsx`, adhere strictly to `ProfilePanelContract` and `CameraPanelContract` defined in `test/integration-acceptance.test.ts`.
2. **Favorites Sanitation:** Ensure `localStorage.getItem("birthday-favorites")` uses safe array checking (`Array.isArray`) before invoking array methods.
3. **External Link Rendering:** If rendering an external Instagram profile button or creator link, sanitize the URL through safe protocol validation (allowing only `https:` and `http:`) and add `rel="noopener noreferrer" target="_blank"`.
4. **Media Stream Teardown:** Ensure the `takePhoto()` method and any `useEffect` cleanup hook in `CameraPanel` call `.stop()` on all tracks obtained from `stream.getTracks()` to ensure camera hardware status lights turn off immediately.

---

*Report certified by Agent 3: QA and Integration Reviewer.*
