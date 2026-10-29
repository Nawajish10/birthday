# User & Interaction Flows — Meerah Birthday Experience

## 1. High-Level Navigation Flow

```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```
[ Visitor enters link ]
         │
         ▼
[ Passcode Gate (/) ] ──(Incorrect)──► [ Error message + retry ]
         │ (Correct passcode)
         ▼
[ Interactive 2D Scrapbook Landing Page (tab: "home") ]
   │
   ├──► Main Navigation Tabs (Persistent App Shell)
   │       ├── "Home"     ──► Scrapbook landing page (`tab: "home"`)
   │       ├── "Memories" ──► Stories & photo memories stream (`tab: "stories"`)
   │       ├── "Profile"  ──► Instagram-inspired grid & favorites (`tab: "profile"`)
   │       ├── "Songs"    ──► Music Room & curated catalogue (`tab: "songs"`)
   │       ├── "Study"    ──► Dedicated Read & Study bookshelf (`tab: "study"`)
   │       ├── "Games"    ──► Interactive Games Hub (`tab: "games"`)
   │       └── "Chat"     ──► Private 1-to-1 E2EE Chat (`tab: "chat"`)
   │
   ├──► Section 1: Welcome Hero
   │       └── CTA: "Open your little world ↓" (Smooth scrolls to Section 2)
   │
   ├──► Section 2: Interactive Scrapbook Card Wall (8 Active Destinations)
   │       ├── "birthday-book" ──► Opens Birthday Book Keepsake (`showFullBook: true`)
   │       ├── "letter"        ──► Navigates directly to personal letter page in Birthday Book
   │       ├── "our-memories"  ──► Navigates to Memories tab (`tab: "stories"`)
   │       ├── "camera"        ──► Navigates to Snap Camera in Memories tab
   │       ├── "songs"         ──► Navigates to Music Room (`tab: "songs"`)
   │       ├── "study"         ──► Navigates to Read & Study panel (`tab: "study"`)
   │       ├── "games"         ──► Navigates to Games Hub (`tab: "games"`)
   │       └── "video"         ──► Opens dedicated Birthday Video modal (`showVideoModal: true`)
   │
   ├──► Section 3: Prominent Music Card
   │       ├── Play/Pause button ──► Controls shared audio element in Experience.tsx (no autoplay)
   │       ├── Track selection   ──► Plays selected track & animates spinning vinyl platter
   │       └── "Open Complete Songbook" ──► Switches to Music Room (`tab: "songs"`)
   │
   ├──► Section 4: Birthday Book Entry Point
   │       └── "Open Birthday Book ✿" ──► Toggles `showFullBook = true` (Full book canvas with back button)
   │
   └──► Section 5: Memories and Photographs Preview
           ├── Click Polaroid Photo ──► Opens full-screen media lightbox with caption & dismiss
           └── "Open all memories →" ──► Switches to Memories tab (`tab: "stories"`)
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```

---

## 2. Scrapbook Landing & Book Exploration Flow

1. **Initial Post-Passcode State:**
   - Visitor lands on `tab === "home"`.
   - `HeroSection` renders personalized greeting in English and Urdu with symbolic avatar.
   - Scrapbook cards wall renders with organic tilts and paper textures.
   - Music player is initialized with the first playlist track, but audio does NOT play automatically (strictly waiting for user gesture).

2. **Opening the Birthday Book:**
   - Visitor clicks "Open Birthday Book ✿" in Section 4 or the "Birthday Book" card in Section 2.
   - `Experience.tsx` toggles state `showFullBook = true`.
   - The landing page transitions into the interactive keepsake book (`BookCanvas`).
   - A floating "← Back to scrapbook" button remains visible at the top-left of the book canvas.
   - Clicking "← Back to scrapbook" toggles `showFullBook = false`, restoring the 2D scrapbook landing page with preserved state (music continues uninterrupted).

3. **Exploring Photo Memories:**
   - Section 5 renders up to 4 featured memories in Polaroid frames.
   - Clicking a photo invokes `onSelectPhoto({ url, caption, media_kind })`.
   - The shared lightbox modal opens over the page with accessible labels, high-resolution view, and close control (`Esc` or backdrop click).
   - Clicking "Open all memories →" switches the active tab to `tab: "profile"`, showing the complete Instagram-inspired grid with posts, reels, and favorites.

---

## 3. Scrapbook Landing Music Card Flow

- **Playback Lifecycle:**
  - Audio element lives inside `Experience.tsx` and persists across all tab switches and modal views.
  - LandingMusicCard receives current `isPlaying`, `currentTrack`, and playlist data as props.
  - Clicking play initiates audio playback via HTMLAudioElement `.play()`.
  - When playing:
    - Vinyl platter spins smoothly (`@keyframes vinylSpin 3s linear infinite`).
    - Tonearm rotates to active resting angle (`transform: rotate(18deg)`).
    - Play button label updates to "Pause [title] by [artist]".
  - When paused:
    - Vinyl rotation pauses (`animation-play-state: paused`).
    - Tonearm returns to idle position.
  - Clicking a tracklist item:
    - If the item is already selected: toggles play/pause.
    - If a different item is clicked: immediately loads and plays the new track.
  - Clicking "Open Complete Songbook": transitions visitor to `tab: "songs"` (Music Room) with full 50-song catalogue and advanced controls.

---

## 4. Music Room Interaction Flow

1. **Catalogue Browsing & Real-time Search:**
   - Visitor enters `tab === "songs"`.
   - The catalogue displays 50 curated tracks with romantic styling, titles, artists, duration badges, and heart bookmark toggles.
   - **Instant Search:** Typing into the search bar filters tracks in real-time by title or artist with zero latency.
   - **Category & Playlist Filtering:**
     - `All Tracks`: Renders all available catalogue items.
     - `Favorites`: Displays only tracks marked as favorite by the user.
     - `Playlists`: Curates by mood ("Meerah's Favorites", "Acoustic & Soft", "Late Night Starlight", "Desi Melodies", "Timeless Classics").

2. **Now Playing Card & Size Mode Switching:**
   - Now Playing card supports three dynamic presentation modes:
     - `compact`: Streamlined slim player bar for lightweight continuous listening.
     - `standard`: Balanced card featuring album art, vinyl platter, track info, and core transport buttons.
     - `expanded`: Immersive showcase featuring rotating vinyl disc, tonearm, seek scrubber, detailed timestamps, and lyrics/notes preview.
   - **Interruption-Free Size Toggling:** Switching between compact, standard, and expanded modes toggles layout classes and styles dynamically without stopping, pausing, or rebuffering the active audio stream.

3. **Playback Controls, Volume & Seeking:**
   - **Transport Controls:** Play/pause, previous/next track with circular boundary safety, shuffle mode (random non-consecutive selection), and repeat mode (loops active track or list).
   - **Seek Bar:** Draggable progress slider allowing instantaneous seeking to any timestamp; displays formatted current time and total duration (`mm:ss`).
   - **Volume Slider:** Smooth logarithmic audio adjustment (0–100%) with one-click mute/unmute restoring the prior volume level.
   - **Motion Safety:** Automatically disables vinyl disc rotation and pulsating visualizers when `prefers-reduced-motion` is detected.

4. **Local Audio File Import:**
   - Visitor taps "Upload Songs" button to trigger file picker (`<input type="file" accept="audio/*">`).
   - Selected audio file is converted to a secure object URL via `URL.createObjectURL(file)`.
   - The local track is prepended to the catalogue with a `Local Track` badge and immediately begins playback.
   - **Safe Resource Cleanup:** Whenever a new track is chosen or the component unmounts, existing object URLs are revoked via `URL.revokeObjectURL(url)` to prevent browser memory leaks.

5. **Hardware Singleton Isolation:**
   - `MusicRoom` receives the shared audio ref (`externalAudioRef={playerRef}`) and playback state from `Experience.tsx`.
   - Never instantiates duplicate `<audio>` elements, ensuring audio continues uninterrupted when switching tabs between Music Room, Scrapbook, Profile, and Chat.

---

## 5. Private 1-to-1 Chat Interaction Flow

1. **Strict Human Exclusivity (Zero-AI Guarantee):**
   - The private chat channel (`tab === "chat"`) is reserved strictly for 1-to-1 human messaging between Creator and Recipient (Meerah).
   - The AI companion Noah is strictly excluded from this private thread; no LLM prompts or synthetic responses are ever triggered or inserted into the timeline.

2. **Key Derivation & Cryptographic Handshake:**
   - On chat initialization, the client retrieves the conversation secret and deterministic salt.
   - Web Crypto API derives an `AES-GCM-256` key using `PBKDF2` (HMAC-SHA-256, 100,000 iterations).
   - Derived `CryptoKey` instances reside exclusively in volatile browser memory; raw key material is never written to localStorage, cookies, or sent over network payloads.

3. **Security Fingerprint Verification Modal:**
   - User taps the security lock/shield badge in the chat header.
   - An accessible dialog opens displaying the 64-character SHA-256 safety fingerprint formatted in 16 uppercase blocks of 4 hex characters (e.g. `A1B2 C3D4 ...`).
   - Meerah and Creator can verify safety numbers out-of-band to confirm cryptographic integrity against Man-in-the-Middle (MITM) attacks.

4. **Message Composition & Rich Media Attachments:**
   - User types in the composer text field with emoji picker support.
   - **Photo Upload:** Selects JPEG/PNG/WebP (≤15 MB); client encrypts image data and renders an inline preview.
   - **Video Upload:** Selects MP4/WebM (≤50 MB); client encrypts video stream and renders an embedded video player.
   - **Curated Romantic GIFs:** Opens GIF drawer and selects romantic reaction GIFs; GIF payload is encrypted and sent.
   - **Voice Notes:** User clicks the microphone button:
     - Live recording timer begins with pulsating audio wave indicator.
     - Clicking cancel discards audio; clicking send stops recording, encodes WebM audio (≤10 MB), encrypts payload, and delivers the voice note with interactive scrubber.

5. **Transmission, Tamper Detection & Decryption Lifecycle:**
   - **Outgoing:** Client generates a cryptographically secure 12-byte random IV (`crypto.getRandomValues`). The message and attachments are encrypted using AES-GCM (256-bit).
   - **Optimistic State:** Message is immediately inserted into timeline with a `sending` badge.
   - **Transport & Delivery:** Payload is transmitted to backend storage/Supabase. On acknowledgement, status updates to `sent` or `delivered`.
   - **Incoming Decryption & Tamper Rejection:** When reading encrypted payloads, client attempts AES-GCM decryption with verification of the 128-bit authentication tag. If ciphertext, IV, or tag has been tampered with or corrupted, `ChatDecryptionError` is caught and the message displays an explicit tamper warning ("Decryption Failed / Message Tampered").
   - **Offline Fallback:** If network is unavailable, messages persist locally using data URLs and local memory so user messages are never dropped.

---

## 6. Protected Vault (Eternalus) Flow

- Unlocked strictly via separate face verification check.
- Navigated through profile footer or navigation bar.
- Completely isolated from birthday captures, guest notes, music audio, and standard landing scrapbook contents.

---

## 7. Instagram-Inspired Profile Flow

1. **Profile Initialization & Dynamic Birthday Calculation:**
   - Navigated via `tab === "profile"` in the main navigation.
   - Profile header dynamically renders avatar, display name, bio, and curated interest tags.
   - Displays real-time dynamic age badge computed via `calculateAge` (24 years old) and a live countdown to the next birthday computed via `calculateNextBirthdayCountdown`.
   - Countdown automatically handles leap years and displays celebratory confetti message when `isToday === true`.

2. **User-Created Highlights Carousel:**
   - Horizontal scrolling carousel of circular highlight covers with romantic gold borders.
   - Clicking an existing highlight launches the interactive `StoryViewer` with the highlight's preselected photos.
   - Authorized users (`canEdit: true`) see a "+ New" button opening the Highlight Creation Modal to name the highlight, choose a cover photo, and save to persistent storage.
   - Highlights can be safely removed; removing a highlight leaves the underlying photos intact.

3. **Tabbed Media Grid & Lightbox Viewing:**
   - Grid tabs: "Posts" (grid view of curated birthday photos), "Reels" (celebration video reels with duration badges), and "Favorites" (photos bookmarked with a heart).
   - Tapping any photo tile opens the full-screen media lightbox with caption, date, favorite toggle, and accessible close button (`Esc` key or backdrop tap).
   - Tapping the heart icon instantly updates the favorite state with local storage persistence.

4. **Profile Identity Editing:**
   - When authorized (`canEdit: true`), an "Edit Profile" button opens an accessible modal dialog.
   - Allows updating display name, bio text, interest tags, and avatar image.
   - Persists changes immediately to local storage and backend sync.

---

## 8. Photo Ingestion & Mobile Camera Pipeline Flow

1. **Dual Ingestion Entry Points:**
   - Initiated via "+ Add Photo" in Memories tab, "Snap Camera" on the scrapbook wall, or camera button in profile.
   - Opens the accessible `PhotoUploadModal` with modal backdrop and `Esc` dismiss.

2. **Live Mobile Camera Capture:**
   - Requests camera access via `navigator.mediaDevices.getUserMedia({ video: { facingMode } })`.
   - Supports camera toggling between front-facing ("user") and rear-facing ("environment") cameras.
   - Hardware cleanup guarantee: Whenever the modal closes, switches modes, or unmounts, `stopMediaTracks` stops all tracks in the MediaStream to turn off the hardware camera indicator.

3. **Device File Picker & Drag-and-Drop:**
   - Alternative file picker accepting JPEG, PNG, WebP, and AVIF images.
   - Validates file size (≤ 12 MB) and MIME types; displays instant inline feedback if validation fails.

4. **Explicit Consent Guardrail & Preservation on Error:**
   - Capturing or selecting a photo enters a preview review state with an effective capture date picker, "Mark date as unknown" checkbox, and caption input.
   - Photos are NEVER uploaded automatically without the visitor clicking "Save to Memories ✿".
   - If a network or storage error occurs, the photo preview is preserved so the user never loses their captured shot.

---

## 9. Snapchat-Inspired Memories Timeline & "On This Day" Flow

1. **Memories Tab Navigation:**
   - Navigated via `tab === "stories"` in the main navigation.
   - 4 tab views: "All Photos", "On This Day", "Albums", and "Stories".

2. **Chronological Timeline ("All Photos"):**
   - Photos grouped into collapsible monthly and yearly sections (`groupPhotosChronologically`).
   - Sticky month headers ("October 2024", "October 2023", etc.) with photo counts.
   - Clicking any photo opens the Lightbox and records the scroll position. Closing the Lightbox restores the exact scroll position with zero jump.

3. **"On This Day" Flashback View:**
   - Matches photos captured on today's calendar date in past years (`isOnThisDay`).
   - Photos with unknown capture dates (`hasKnownCaptureDate === false`) or current-year uploads are strictly excluded to avoid false positives.
   - Renders milestone header banners ("1 Year Ago Today ✿", "2 Years Ago Today ✨") with golden confetti flourishes.

4. **Albums View & Creation:**
   - Displays user-created and curated photo albums.
   - "+ Create Album" button opens a modal to name the album, provide a description, select photos, and save.
   - Deleting an album safely cleans up the collection while leaving all referenced photos intact.

---

## 10. Story Creation & Single-Audio Experience Flow

1. **Story Builder Modal:**
   - Visitor taps "+ Create Story" in the Stories tab.
   - Allows selecting multiple photos, reordering slides via drag or move controls, and entering a story title.
   - Curated Music Picker: Directly integrates with the 50-song music catalogue (`music-catalogue.ts`), allowing the user to select and preview romantic background soundtracks.
   - Saves story item to local media storage.

2. **Interactive Story Playback (`StoryViewer`):**
   - Fullscreen immersive story player with segmented progress bars for each photo slide.
   - Automatic slide advance after 5 seconds (`DEFAULT_SLIDE_DURATION_MS = 5000`).
   - Interactive gesture navigation:
     - Tap left 30% of screen: step backward to previous slide.
     - Tap right 70% of screen: advance forward to next slide.
     - Touch-and-hold (or mouse down): pauses story timer and audio while holding; releases to resume.
     - Sound toggle: mute/unmute soundtrack.
     - Close button (`✕`) or `Esc`: closes story and restores previous state.

3. **Single-Source Audio Engine Bridge:**
   - `StoryViewer` receives `externalAudioRef={playerRef}` from `Experience.tsx`.
   - On open: captures the existing audio element state (playback position, active track, playing status) via `captureAudioState`.
   - Loads and plays the story soundtrack without instantiating any secondary `<audio>` element.
   - On close: calls `restoreAudioState` to cleanly stop or restore the user's prior audio playback. Zero duplicate audio engines are ever created.



---

## 11. Snapchat Camera Default, Multi-Template Study Sanctuary, and Multiplayer Games Flows

### 11.1 Snapchat Camera Default Experience Flow
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```
[ User opens Memories Tab (`tab === "stories"`) ]
         │
         ▼
[ Camera View (Default: `activeTab === "camera"`) ]
   ├── Live Camera Stream (Center viewfinder, 4:3 / 16:9 responsive)
   ├── Top Bar: Torch Toggle, Flip Camera, Notification Bell Dropdown
   ├── Bottom Bar:
   │     ├── Left: Gallery Shortcut (Jumps to "All Photos" tab)
   │     ├── Center: 72px Prominent Shutter Button (Tap = Photo snapshot)
   │     └── Horizontal Filter Carousel:
   │           [ Natural ] [ Warm Sun ] [ Soft Rose ] [ Vintage Film ] [ Cinematic ] [ Golden Hour ]
   └── Snapshot Preview:
         ├── Canvas Filter Applied (WYSIWYG filter bake)
         ├── Caption input (max 280 chars)
         ├── Explicit Consent Guardrail ("Add to Memories" required; never auto-uploads)
         └── Retake / Cancel
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```

### 11.2 Read & Study Multi-Template Sanctuary Flow
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```
[ User opens Study Tab (`tab === "study"`) ]
         │
         ├── Genre Filter (12 Genres: Fiction, Romance, Mystery, Fantasy, Sci-Fi, Biography,
         │                 Self-Development, History & Philosophy, Manga, Anime-Inspired,
         │                 Comics/Graphic Novels, Poetry)
         │
         ├── Bookshelf Catalog / Search (Full-text query across titles, authors, Urdu verses)
         │
         └── Book Modal & Interactive Reader
               ├── Tab 1: "About Book" (Metadata, Curator's Warm Rationale, Golden Quotes)
               └── Tab 2: "Interactive Reader"
                     ├── Template Switcher (8 Presentation Modes):
                     │     1. Minimal (Clean distraction-free typography)
                     │     2. Romantic Literary Journal (Parchment, serif, cursive, floral flourishes)
                     │     3. Manga-Inspired Panel Layout (Japanese RTL framing, screentone, speech bubbles)
                     │     4. Anime-Inspired Illustrated Story (Visual novel dialogue card & glowing stars)
                     │     5. Graphic Novel Layout (Color frames, sound effect bursts)
                     │     6. Bookshelf (Wooden shelf header, open book layout, ribbon bookmark)
                     │     7. Notes Workspace (Split reading pane + editable margin notes scratchpad)
                     │     8. Study Cards (3D flip cards with question/takeaway prompts)
                     ├── Chapter Navigation (Prev Chapter / Next Chapter controls)
                     ├── Bookmark Toggle (Persisted to localStorage)
                     └── Margin Notes Form (Saved per book in local storage)
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```

### 11.3 Real-Time Multiplayer Games Flow
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```
[ User opens Games Tab (`tab === "games"`) ]
         │
         ├── Mode Switcher: [ 🎮 Solo Play (Instant) ] vs [ 👥 Real-Time Multiplayer Room ]
         │
         ├── Category Filters: [ All ] [ Competitive ] [ Cooperative ] [ Social & Party ] [ Solo ]
         │
         ├── Solo Play Path:
         │     └── Tap "Play Solo" on any game ──► Instant canvas mount with restart & complete hooks
         │
         └── Multiplayer Room Path:
               ├── Host: Taps "Create Room" on supported game (`connect-four`, `trivia-duel`, etc.)
               │     ├── System generates 6-character room code (e.g. `MEER26`)
               │     └── Host waits in lobby for Player 2
               │
               ├── Guest: Enters 6-character code in top lobby bar and taps "Join Room →"
               │     └── Room updates status to "in-game"
               │
               └── Synchronized In-Game Play:
                     ├── State synchronized across tabs via storage events & memory fallbacks
                     ├── Turn alternation ("Your Turn!" vs "Waiting for opponent...")
                     └── Win / completion detection with celebratory banner and scores
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```

---

## 11. Passcode Authentication & Gate Access Flow (DDMMYYYY Authoritative Verification)

```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```
[ Visitor arrives at babyyy.axcrivo.in / root ]
               │
               ▼
[ Server renders PasscodeGate (`readScope('birthday') === false`) ]
               │
   ┌───────────┴────────────────────────┐
   │ PasscodeGate Component (UI)        │
   │  - Inputs: 8-digit date (DDMMYYYY) │
   │  - Eye toggle (show/hide password) │
   │  - Primary CTA: Open World         │
   │  - Double-submit prevention guard  │
   └───────────┬────────────────────────┘
               │
               ▼
[ Visitor submits passcode (e.g. "30102001") ]
               │
               ▼
[ Client normalizes: `code.trim()` -> `POST /api/access` ]
               │
               ├──► Tier 1: Authoritative Timing-Safe Check
               │    - `crypto.timingSafeEqual` over SHA-256 digests
               │    - Matches `AUTHORITATIVE_BIRTHDAY_CODE` ("30102001")
               │    - Immune to DB latency, cold starts, and schema misses
               │
               ├──► Tier 2: Supabase RPC `verify_access_code`
               │    - Rate-limit check & bcrypt hash verification
               │    - Auto-healing sync if DB was unseeded
               │
               ▼
[ Result Evaluation ]
   ├── Code Matches (Tier 1 or Tier 2):
   │     ├── Issues signed `meerah_access` cookie (`httpOnly`, `sameSite: lax`, 12h)
   │     ├── Sets `meerah_visitor` tracking cookie (90 days)
   │     ├── Clears lockout bucket if authoritative code entered
   │     ├── Returns HTTP 200 `{ ok: true }`
   │     └── Client transitions -> unloads gate & opens full birthday experience
   │
   ├── Code Mismatched:
   │     ├── Returns HTTP 401 `{ error: "That date is not correct..." }`
   │     └── Client displays inline alert badge with subtle shake
   │
   └── Rate Limited (6+ wrong attempts in DB):
         ├── Returns HTTP 429 `{ error: "Too many attempts..." }`
         └── Client displays cooldown warning
```

---

## 9. Private Music System & Persistent Audio Engine Execution Flow

```text
================================================================================
                    MUSIC SYSTEM END-TO-END EXECUTION FLOW
================================================================================

1. AUDIO INGESTION & STORAGE PIPELINES
--------------------------------------------------------------------------------
A) CLI Batch-Import (`scripts/import-music.ts`):
   Manifest (CSV/JSON) + Audio Directory
         │
         ├──► Validates manifest columns (title, artist, album, audio_filename, playlist)
         ├──► Checks file existence & binary magic bytes (MP3, WAV, M4A, AAC, OGG, FLAC)
         ├──► Computes SHA-256 file checksum for duplicate prevention
         ├──► Deduplication: queries public.music_tracks by checksum / title+artist
         │      ├── Duplicate found -> Skips upload (idempotent, safe)
         │      └── New track -> Continues
         ├──► Ingests file to Supabase Storage: bucket `birthday-audio`, path `audio/{track_id}/{filename}`
         ├──► Inserts metadata record to `public.music_tracks` with `is_published: true`
         └──► Associates with playlist in `public.music_playlist_tracks` if specified

B) Authenticated Admin Upload Interface (`src/components/admin/music/AdminMusicUpload.tsx`):
   Browser Drag-and-Drop / File Picker (max 50MB)
         │
         ├──► Extracts duration via browser Audio metadata API
         ├──► Validates MIME type and file size client-side
         ├──► `POST /api/music/upload` (Multipart Form, server-verified admin authorization)
         │      ├── Server sniffs binary magic bytes
         │      ├── Uploads to private `birthday-audio` bucket via `getAdminClient()`
         │      └── Inserts row into `music_tracks` table
         └──► Progress reported via XHR progress events with retry capability

2. PERSISTENT PLAYBACK & SHARED AUDIO LIFECYCLE
--------------------------------------------------------------------------------
Single Shared Controller (`src/lib/music/use-music-store.ts`):
   Component Mounts (MusicRoom / StoryViewer / Ambient)
         │
         ├──► Reads state snapshot via `useSyncExternalStore` (zero state divergence)
         ├──► Accesses single shared `<audio>` ref via `getMusicAudioRef()`
         ├──► Calls `store.restorePlaybackState()`
         │      ├── `GET /api/music/playback-state`
         │      └── Sets trackId, queue, queueIndex, shuffle, and seeks position
         │          (Respects autoplay restrictions: remains paused until user gesture)
         │
   Playback Navigation & Queue Correctness:
         ├── Next Track (`next()`):
         │     ├── `repeatMode === 'one'` -> seeks to 0, replays current track
         │     ├── `isShuffle === true` -> picks random distinct index in queue
         │     └── `repeatMode === 'all'` -> wraps around to index 0 at queue boundary
         │
         ├── Previous Track (`previous()`):
         │     ├── If `currentTime > 3s` -> restarts current track
         │     └── Else -> steps back to previous queue track (or wraps)
         │
         └── Checkpointing & State Persistence:
               ├── Track change / pause / transition -> 5-second debounced `persistPlaybackState()`
               └── Writes to `public.music_playback_state` via `PUT /api/music/playback-state`

3. STORY-MUSIC ISOLATION & REGRESSION PROTECTION
--------------------------------------------------------------------------------
StoryViewer opens with `externalAudioRef={sharedAudioRef}`:
   StoryViewer Mount
         │
         ├──► Captures ambient audio state (`captureAudioState`)
         │      - { src, currentTime, wasPlaying, volume }
         ├──► Pauses ambient audio cleanly without unmounting audio engine
         ├──► Plays Story-specific audio track
         │
   StoryViewer Closes
         │
         └──► `restoreAudioState` restores prior ambient track and exact position
              (Resumes only if it was playing before story opened; no unwanted autoplay)

4. PERSONAL USER FEATURES (LIKES, PLAYLISTS, HISTORY & LYRICS)
--------------------------------------------------------------------------------
- Likes: Instant optimistic toggle in UI -> `POST/DELETE /api/music/likes` (unique per user).
- Playlists: `CreatePlaylistModal`, `EditPlaylistModal`, `AddToPlaylistModal` -> `public.user_playlists`
  and `public.user_playlist_tracks` with atomic sorting and ownership checks.
- History: After 30s playback or track completion -> `POST /api/music/history`.
  "Recently Played" view renders relative times ("Just now", "5m ago", "Yesterday") with click-to-play.
- Lyrics: `GET /api/music/lyrics/[track_id]`. Synchronized timed lyrics auto-scroll to active line
  calculated from `currentTime * 1000` with click-to-seek interactivity.
```


================================================================================
10. LANDING PAGE 9-SECTION ARCHITECTURE & MIDNIGHT REVEAL EXECUTION
================================================================================

1. MIDNIGHT BIRTHDAY REVEAL LIFECYCLE (SECTION 1)
--------------------------------------------------------------------------------
Visitor lands on Application -> Experience.tsx loads (`tab === "home"`):
   1. MidnightBirthdayReveal Mounts:
      - Reads client timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone` or fallback "Asia/Kolkata").
      - Computes target date parts via `getTimezoneDateParts(now, "Asia/Kolkata")`.
      - Checks if today is October 30 (`isBirthdayActive`).
      - Checks `localStorage.getItem("birthday-reveal-completed-YYYY-10-30")`.
   2. Activation State Machine:
      - IF (Today === Oct 30 AND !alreadyCompleted) OR forcePreview === true:
        -> `isVisible = true`
        -> Dialog overlay renders (`role="dialog"`, `aria-modal="true"`).
        -> Attempts audio playback (`playBirthdayAudio()`):
           * Primary: explicit `audioSrc` -> HTMLAudioElement.play()
           * Fallback: Web Audio API synthesized music-box acoustic chime (`playMusicBoxChime()`).
           * IF Autoplay Blocked:
             - Captures promise rejection without error.
             - Sets `autoplayBlocked = true`.
             - Displays "Tap to celebrate ♫" button for user gesture.
      - IF Dismissed by user:
        -> Sets `localStorage.setItem("birthday-reveal-completed-YYYY-10-30", "true")`.
        -> Stops chime/audio oscillator.
        -> Invokes `onRevealComplete()` callback.
        -> Hides modal (`isVisible = false`).
      - Periodic Real-Time Transition:
        -> Evaluates interval check (`checkIntervalMs = 1000`) so active users transition
           to celebration automatically when the clock strikes midnight without refreshing.

2. NINE-SECTION LINEAR NARRATIVE PROGRESSION (SECTIONS 1-9)
--------------------------------------------------------------------------------
[1. Midnight Reveal] 
   └── Modal dialog (Oct 30 midnight gate / music-box chime)
[2. Welcome Hero & Avatar] 
   └── Cameo silhouette / photo + floral wreath (sunflower/rose/white) + "Open your little world" CTA
[3. Swipeable Photo Cards] 
   └── Touch carousel (45px threshold) + dot indicators + polaroid frames + click-to-view
[4. Personal Messages & Poetry] 
   └── Bicultural deck + English notes + Urdu ghazal (dir="rtl", lang="ur") + wax seals
[5. Birthday Book Invitation] 
   └── 3D bound book spine + antique gold foil stamp ("For my baba" / "تمہاری سالگرہ") + open book CTA
[6. Our Soundtrack] 
   └── Vinyl turntable display + single-audio-controller delegation + quick select list + songbook link
[7. Memories Preview] 
   └── 4 polaroid preview cards + washi tape corners + captions + "Explore memories" CTA
[8. Explore Your World] 
   └── 6-destination button grid (Profile, Games, Study, Music Room, Memories, Book)
[9. Closing Message] 
   └── Handcrafted letter card + crimson wax seal + signoff ("With all my love ♡") + "Return to beginning"


================================================================================
11. PHOTO INGESTION DATA FLOW, IMAGE DERIVATIVE PIPELINE & NAVIGATION DEDUPLICATION
================================================================================

1. GOOGLE PHOTOS INGESTION & PIPELINE DATA FLOW
--------------------------------------------------------------------------------
   [Shared Album URL Input]
   (photos.app.goo.gl/{id} OR photos.google.com/share/{id}?key={auth})
                 │
                 ▼
   [URL Validation & Host Allowlist] ──(Invalid/Malicious)──> [Reject & Fallback]
                 │ (Valid)
                 ▼
   [Server API Route: /api/photos/google]
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
   [Live HTML Scraping]   [Offline Fallback]
   (Extract lh3 URLs &     (Bundle Manifest:
    metadata)              google-photos-manifest.json)
      └──────────┬──────────┘
                 ▼
   [Deduplication & Stable ID Hashing]
   (SHA-256 / content hash -> gp-{id})
                 │
                 ▼
   [Image Derivative Pipeline]
   ┌──────────────────────────────────────────────┐
   │ Thumbnail: =w400-h400-c (Square Polaroid)    │
   │ Full Preview: =w1920-h1080 (Optimized HD)   │
   │ Bounded Max: =s1200                          │
   │ Direct Download: =d                          │
   └──────────────────────────────────────────────┘
                 │
                 ▼
   [Canonical PhotoAsset Schema Mapping]
   (id, url, thumbnailUrl, effectiveCaptureDate,
    hasKnownCaptureDate, caption, altText, isPrivate)
                 │
                 ▼
   [Unified Media Storage / React State Engine]
   (localStorage / In-Memory State via media-service.ts)
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
  [Profile Surface]   [Memories Surface]

2. MULTI-SURFACE RENDERING ARCHITECTURE
--------------------------------------------------------------------------------
   A. Profile Page Flow (`ProfilePanel.tsx`):
      PhotoAsset[] ──> transformPhotosToProfilePosts() ──> ProfilePostItem[]
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
      [posts Mode]       [reels Mode]       [favorites Mode]
      (Images only)      (Videos only)      (Heart-saved items)
            │                  │                  │
            └──────────────────┴──────────────────┘
                               │
                               ▼
                    [Aspect Ratio Grid]
                               │
                               ▼
               [Photo/Video Lightbox Modal]
               - Keyboard Escape listener
               - Focus trap within modal
               - Zero autoplay compliance

   B. Memories Room Flow (`MemoriesPanel.tsx`):
      PhotoAsset[]
            │
            ├─► [Chronological Timeline] (groupPhotosChronologically())
            │   ├── Known dates -> Year-Month descending buckets
            │   └── Unknown dates -> "Cherished Moments ✿" curated group
            │
            ├─► [On This Day Retrospective] (groupPhotosOnThisDay())
            │   └── Matches Oct 29/30 memories across historical years (2022-2025)
            │
            └─► [Album Collections] (createAlbumFromIngestedPhotos())
                └── Themed albums with cover thumbnails and photoId references

3. SINGLE AUTHORITATIVE BOTTOMNAV ARCHITECTURE
--------------------------------------------------------------------------------
   Root Application Container (`src/components/Experience.tsx`)
                 │
                 ▼
   [Active Tab State: tab ("home" | "stories" | "profile" | "songs" | "study" | "games" | "chat")]
                 │
       ┌─────────┼─────────┬─────────┬─────────┬─────────┬─────────┐
       ▼         ▼         ▼         ▼         ▼         ▼         ▼
     [Home]  [Memories] [Profile] [Music]   [Study]   [Games]   [Chat]
       │         │         │         │         │         │         │
       └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
                                     │
                                     ▼
                 [Single Authoritative BottomNav Instance]
                 (Rendered exactly once in Experience shell footer)
                 ┌──────────────────────────────────────────────┐
                 │ ⌂ Home    ◎ Memories  ▦ Profile  ♫ Music   │
                 │ 📖 Study  🎮 Games     ☏ Chat               │
                 └──────────────────────────────────────────────┘
                 - position: fixed, bottom: 0, z-index: 999
                 - env(safe-area-inset-bottom) clearance
                 - role="navigation" + aria-label="Application Navigation"
                 - role="menubar" + role="menuitem" + aria-current="page"
                 - Ambient repeated headers completely eliminated from all sub-tabs

4. SECURITY, PRIVACY & DEFENSIVE DATA FLOW
--------------------------------------------------------------------------------
   Input Path / Filename ──► [sanitizeAssetPath()]
                             ├── Strip "../" and "..\\" directory traversal
                             ├── Strip leading slashes and drive letters
                             └── Sanitize null bytes (\0)
                             └── Safe storage path: google-photos/{filename}

   URL / Log Output ──────► [redactSensitiveUrlParams()]
                             ├── Redact auth keys: ?key=[REDACTED]
                             ├── Redact tokens: ?token=[REDACTED]
                             └── Protect private credentials from client logs
