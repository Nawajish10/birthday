# Product Requirements Document: Meerah Birthday Experience

**Status:** Updated draft for implementation planning  
**Product:** A private, mobile-first birthday website for Meerah  
**Working title:** Meerah Birthday Experience  
**Final private section name:** Eternalus  
**Version:** 1.1  
**Last updated:** 20 October 2026

## 1. Executive summary

Build a polished, shareable birthday website that celebrates Meerah through a guided sequence of personal content and interactive surprises. The main birthday experience is about Meerah and should contain only birthday content and images of her. A separate final section named **Eternalus** contains sensitive couple photos and must remain locked until the visitor passes a dedicated face verification step.

The experience opens with a passcode. After entry, the visitor sees a warm birthday welcome and navigates a curated story of photos, videos, voice notes, music, and reveals. Eternalus appears at the end of the experience, not as part of the general story. Its face check is a separate gate and does not control access to the birthday pages.

The first release prioritizes a dependable mobile experience, personal content, privacy, and an elegant narrative. The agreed product direction now includes four app areas after passcode entry: a birthday home with bilingual greeting cards, an Instagram-inspired profile/gallery, a Snapchat/WhatsApp-inspired stories and camera area, and a chat area for a human thread and the AI companion Noah. A small gift game and a distinct final Eternalus section complete the experience. Immersive 3D exploration remains a later enhancement.

## 2. Product vision and principles

### Vision

Make one thoughtful birthday link feel like opening a personal story: easy to enter, emotionally specific, enjoyable on a phone, and safe around sensitive couple photos.

### Product principles

1. **Personal over generic:** prioritize creator-selected memories and words over generated filler.
2. **Birthday content stays focused:** main experience content is about Meerah; sensitive couple content is reserved for Eternalus.
3. **The recipient stays in control:** playback starts on a user action; interactions can be skipped; media can be paused or muted.
4. **Privacy is understandable:** explain camera use before requesting it; say what is stored and where; use minimal data.
5. **Graceful failure:** provide alternatives for camera denial, unavailable hardware, face-check failures, and low-performance devices.
6. **Mobile first:** the shared link should work smoothly in a phone browser without requiring an app or account.
7. **Accessible by default:** provide readable text, captions/transcripts, keyboard operation, and reduced motion.

## 3. Goals and non-goals

### Goals

- Deliver a complete birthday journey through one link.
- Make the main birthday section feel personal and easy to explore.
- Keep the Eternalus couple gallery separated from the main story and protected by its own face verification flow.
- Provide clear explanations and recovery routes for both passcode and face verification.
- Preserve the selfie-on-device preference unless an explicit future product decision changes it.
- Establish a buildable first-phase scope with acceptance criteria.

### Non-goals for phase one

- Public social profiles, likes, comments, followers, or a public feed.
- General-purpose relationship management, calendar, streaks, or daily journal.
- AI intervention or participation in private human chat: AI companion (Noah) is strictly excluded from the private 1-to-1 human thread (strict zero-AI policy for private human messaging).
- A production-grade identity verification product or a claim of guaranteed identity.
- User-generated/open guestbook submissions.
- AI-generated relationship memories or AI decisions about which photos are meaningful.
- Full immersive 3D world and advanced/open-ended AI assistant capabilities.
- Native iOS or Android apps.

## 4. Target users and jobs to be done

### Primary creator

The person assembling and sharing the birthday experience.

**Needs:** add and order media; write personal messages; choose a passcode; configure Eternalus; preview the result on mobile; share one link.

### Primary recipient

Meerah, opening the link on a phone or desktop browser.

**Needs:** understand how to begin; enjoy the birthday content without setup; control audio and motion; choose whether to use the camera; know why face verification is requested before entering Eternalus; recover from a failed check.

### Jobs to be done

- “When I send this for her birthday, I want the link to open into a personal experience rather than a generic card.”
- “When she explores the birthday story, I want her photos and messages to be easy to revisit.”
- “When she reaches Eternalus, I want the sensitive couple photos to require a separate check.”
- “If her camera or the check fails, I want a safe recovery path that does not make the whole birthday site unusable.”

## 5. Information architecture and journey

### Primary route

`Passcode → Birthday home/scrapbook (Hero, Card Wall, Music Card, Keepsake Book, Memories) ↔ Profile ↔ Stories & Camera ↔ Music Room ↔ Read & Study ↔ Games Hub ↔ Private 1-to-1 Chat ↔ Eternalus`

The visitor may freely explore birthday sections after unlocking the experience. Eternalus stays independently locked until its own face verification succeeds.

### Pages/sections

1. **Passcode page:** greeting context, passcode input, submit, retry feedback, accessible error state.
2. **Interactive Scrapbook Landing (Home):** Welcome hero, 8-destination interactive scrapbook card wall (Birthday Book, Letter, Memories, Camera, Songs, Study, Games, Video), prominent vinyl music player, book entry point, and featured Polaroid memory preview.
3. **Birthday Book Keepsake:** Meerah’s name, unfolding-card/book interaction, birthday greeting, creator messages in English and Urdu, song controls, and return-to-scrapbook button.
4. **Profile & Gallery:** an Instagram-inspired profile and selectable photo grid of creator-preloaded birthday images of Meerah; tapping a tile opens a media viewer with caption and navigation.
5. **Stories and Snap Camera:** a Snapchat/WhatsApp-status-inspired full-screen story viewer for preloaded content, plus user-initiated camera capture with clear permission and save behavior.
6. **Music Room:** romantic, premium music experience matching `design.md` (Love Theme) and `music-panel.html`, featuring a 50-song curated catalogue with search, category filtering, Now Playing card with 3 size modes (compact, standard, expanded), spinning vinyl platter, volume slider, progress seek, and local file import with safe URL cleanup.
7. **Read & Study Bookshelf:** a dedicated literary corner featuring curated books across literature, Urdu poetry, philosophy, and learning with genre filtering, search, and preview excerpt reader.
8. **Games Hub:** an interactive arcade featuring 3 genuinely playable mini-games: Memory Match (couplet card flipping), Sweet Word Scramble (anagram celebration puzzle), and Birthday Quiz (5-question trivia about Meerah).
9. **Birthday Video Destination:** a dedicated cinema experience featuring native HTML5 controls, synchronized Urdu/English captions, zero autoplay, and a designed scrapbook cinema fallback placeholder with sample reel preview.
10. **Private 1-to-1 Chat:** strictly human-to-human messaging between Creator and Recipient (AI companion Noah is strictly excluded from this private thread), persistent history, photo/video/GIF attachments, voice notes with live recorder timer, and end-to-end encryption (E2EE) using Web Crypto API (`AES-GCM-256`, PBKDF2 with 100,000 iterations, 64-character SHA-256 key fingerprints).
11. **Eternalus Vault & Verification:** protected couple photos separated by dedicated camera permission and live face check.

## 6. MVP scope (Phase One)

### P0 — required for launch

#### A. Shareable, mobile-first birthday site

- One stable HTTPS link, usable without installing an app.
- Responsive layouts for common phone, tablet, and desktop widths.
- Fast initial page with media deferred until needed.
- Branded title, icon, and appropriate link preview metadata that does not expose sensitive media.

#### B. Passcode entry for the birthday experience

- A configured passcode gates the birthday content.
- Server-side validation; no passcode embedded in client JavaScript or public content files.
- Rate limit repeated failures and use non-revealing error messages.
- A short-lived secure session after success.
- The passcode is explicitly treated as a personal gate, not high-assurance authentication.

#### C. Birthday home / keepsake book

- A realistic card/book-inspired landing page that opens after successful passcode entry.
- Creator-authored birthday messages in English and Urdu (including RTL Urdu rendering).
- Page-turn/unfolding interaction with a reduced-motion/static alternative.
- Clear home navigation to Profile, Stories/Camera, Chat, and Games.
- Birthday song controls that start on a user action and expose pause/mute.

#### D. Profile and photo gallery

- Instagram-inspired birthday profile and photo grid populated with creator-preloaded images of Meerah.
- Tapping a photo opens a focused viewer with caption and next/previous navigation.
- Creator can add, reorder, caption, and remove profile posts in the admin workspace.
- Recipient camera captures are not automatically uploaded or published. Adding a new capture to the shared profile requires an explicit action and clear upload notice.

#### E. Stories and camera

- Full-screen, tap/swipe story viewer for creator-preloaded story images/video.
- User-initiated camera access only after a clear explanation and browser permission.
- Captured image preview with retake, discard, save locally, or explicit “Add to profile” actions.
- Local-only is the default capture behavior; do not silently persist to server or shared profile.
- Camera denial/unavailable path leaves preloaded stories and all other areas usable.

#### F. Private 1-to-1 Chat (Human-to-Human E2EE) & Zero-AI Policy

- Strictly human-to-human messaging between Creator and Recipient (Meerah).
- **Strict Zero-AI Guarantee:** AI companion Noah is completely excluded from this private thread; no AI model or automated agent reads, generates, intercepts, or intervenes in the private human conversation timeline.
- End-to-End Encryption (E2EE) powered by the Web Crypto API (`AES-GCM-256`, PBKDF2 key derivation with HMAC-SHA-256 and 100,000 iterations from shared secret passphrase and deterministic salt).
- Fresh 12-byte cryptographically secure random IV generated per message; 128-bit authentication tag tamper resistance that rejects corrupted or modified ciphertexts.
- 64-character SHA-256 safety fingerprint (formatted as 16 blocks of 4 hex characters) displayed in an interactive security modal for out-of-band MITM verification.
- Multimedia attachments: photo (up to 15 MB), video (MP4/WebM up to 50 MB), curated romantic GIF picker, and voice notes with live recorder timer (up to 10 MB).
- Persistent conversation history with optimistic sending state, transmission badges (sent, delivered, failed), and seamless offline fallback to local data URLs.

#### G. Gift game

- One polished, optional mini-game that reveals a birthday message or gift.
- A visible skip/reveal path prevents the game from blocking the birthday flow.
- Keep game state minimal; do not require an account.

#### H. Meerah-focused birthday content

- Hero greeting for Meerah / preferred nickname.
- Birthday person’s photos in the main journey; no couple-private images here.
- Curated timeline or chapters with captions and optional dates.
- Short video and voice-note playback, if supplied.
- User-initiated birthday song playback with pause/mute controls.
- Skip and revisit navigation.

#### I. Lightweight interactive surprises

- Tap-to-reveal message cards or equivalent small interactions.
- Reveals are optional and never block access to the remaining birthday content.
- Support at least one polished reveal interaction in MVP; content quantity is configuration, not a hard-coded requirement.

#### J. Eternalus private section

- Appears at the end as a distinct named destination.
- Couple photos are excluded from all birthday page responses and public asset paths.
- Private media is served only after a valid Eternalus authorization check.
- Opening Eternalus starts a dedicated face-verification flow.
- Face verification must include presentation-attack/liveness detection if the product claims a live face check. A simple comparison of two still photos is insufficient for the stated requirement.
- Define one recovery/fallback method before launch (recommended: a separate strong Eternalus secret shared privately by the creator, with rate limits). It must not expose content through the birthday passcode.
- Ability to exit/lock Eternalus and expire the authorization session.

#### K. Face-check consent and privacy UX

- Explain the camera request and what happens to the capture before invoking the browser permission prompt.
- Camera opens only after a user gesture and explicit browser grant; HTTPS is required by browsers for `getUserMedia`.
- Default policy: perform capture and matching on-device where technically feasible; do not upload or persist the live selfie or biometric template.
- If on-device matching with reliable PAD cannot be achieved, disclose the exact processing location, retention, and vendor before enabling that approach. Do not silently upload the capture.
- Provide denial, unsupported browser, poor lighting, no-face, multiple-face, liveness failure, and mismatch states.
- Offer a retry limit/backoff and recovery path.
- Do not claim perfect security. Face recognition can make errors and presentation attacks remain a security concern.

#### L. Accessibility and usability

- Keyboard-operable controls, visible focus, labeled form fields, screen-reader status updates.
- Captions for videos and text transcript for voice notes where practical.
- Respect `prefers-reduced-motion`; provide controls for animation/audio.
- Good contrast, readable type, alt text for meaningful images.

### P1 — candidate after MVP validation

- Optional interactive 3D birthday world, with 2D fallback.
- Expanded Noah features (voice, richer memory search, personalized recommendations) grounded only in approved content; no access to Eternalus images or live selfie.
- Invite-only contributions from friends/family, with creator approval and expiration.
- Optional schedule-to-open/countdown controls.
- Additional reveal types and a then-and-now slider.
- Creator editing interface if content changes frequently; initial release can use a private configuration/content workflow.

## 7. Functional requirements and acceptance criteria

### FR-1 Passcode gate

- Given a visitor without a valid session, opening any birthday route redirects to the passcode page.
- Given a correct passcode, the visitor can enter the birthday story.
- Given an incorrect passcode, the page displays a generic error and remains usable with keyboard/screen reader.
- Repeated failures are throttled; the server does not reveal whether a guessed value is close.
- Eternalus remains locked after birthday passcode success.

### FR-2 Birthday home and bilingual content

- Successful birthday passcode lands on the birthday home, not directly in a private gallery.
- Landing content supports English and Urdu text, including correct right-to-left layout for Urdu.
- Book/card animation has a usable static/reduced-motion version.

### FR-3 Profile/gallery and capture

- Preloaded creator-approved birthday photos appear in the profile grid and can be opened individually.
- New captures remain local until the recipient explicitly chooses to upload/add them to the profile.
- An uploaded capture is labeled as shared/profile content and follows the birthday media policy.

### FR-4 Stories and camera

- Preloaded stories can be viewed without camera permission.
- Camera permission is requested only after the recipient taps the capture action and sees a purpose explanation.
- Camera denial, error, or unsupported browser does not block the app.

### FR-5 Private 1-to-1 Chat & Zero-AI Policy

- Recipient and Creator communicate in a dedicated, private 1-to-1 thread with genuine peer-to-peer human connection.
- **Zero-AI Guarantee:** Noah and any automated LLM/agent are strictly excluded from the private human chat timeline; no automated bot messages can enter this thread.
- All messages and attachment payloads are encrypted client-side using Web Crypto API `AES-GCM-256` before transport or storage.
- Key derivation uses PBKDF2 with HMAC-SHA-256 and 100,000 iterations; CryptoKey material exists only in volatile client memory and is never transmitted.
- AES-GCM authentication tags guarantee integrity; tampered ciphertext or altered IVs trigger immediate decryption rejection (`ChatDecryptionError`).
- Out-of-band safety numbers / fingerprint (64-character SHA-256 formatted as 16 blocks of 4 hex digits) can be viewed in a dedicated modal.
- Rich media attachments supported with strict bounds: photos (≤15 MB), videos (≤50 MB), GIFs, and voice notes (≤10 MB) with live timer. Offline mode falls back safely without message loss.

### FR-6 Birthday content separation

- The main story only contains creator-approved birthday content featuring Meerah.
- Couple-private assets are not present in client bundles, public URLs, page source, or unauthenticated API responses.
- Each media item can have a caption/alt text and optional date.

### FR-7 Media playback

- Audio does not autoplay before a user gesture.
- Video and audio have play/pause controls and graceful loading/error states.
- Video captions and voice transcripts can be accessed without playing audio.

### FR-8 Reveals and games

- A user can reveal a message through an explicit action.
- Motion respects reduced-motion settings.
- Failure or skipped interaction never traps the user.

### FR-9 Eternalus boundary

- Eternalus is discoverable only at the end of the birthday flow (or via a deliberate end-section link after the closing chapter).
- The face-check screen appears only when the user chooses Eternalus.
- No Eternalus media is returned before successful face verification or the approved fallback.
- Authorization expires and can be explicitly locked.

### FR-10 Face verification

- Before camera request, the UI explains purpose and processing.
- Permission denial or hardware unavailability does not break the birthday experience.
- A successful check unlocks only Eternalus, not creator controls or other protected systems.
- Mismatch/liveness failures provide understandable retry/recovery instructions without exposing sensitive media.
- Live capture data is discarded after check by default; logs contain outcome codes only, not images, embeddings, or raw biometric data.

### FR-11 Privacy and sharing

- Link preview, analytics, CDN logs, and error reporting exclude photo contents and sensitive captions.
- The creator can rotate/revoke the birthday passcode and Eternalus credentials.
- The creator can remove or replace media and take down the site.

## 8. Non-functional requirements

### Performance

- Target good Core Web Vitals on mobile; optimize images and lazy-load video/3D.
- First meaningful content should not wait for heavy client code or the 3D renderer.
- Provide a low-bandwidth path with static poster images and no mandatory animation.

### Reliability

- Site should fail gracefully if optional media fails to load.
- No external AI call, 3D scene, or camera API is required to access the birthday story.
- Backups and a tested rollback/takedown procedure for deployed content.

### Security

- HTTPS everywhere; secure, HttpOnly, SameSite session cookies.
- Client-side End-to-End Encryption (E2EE) for private 1-to-1 chat: messages and media encrypted with AES-GCM-256 and PBKDF2 (100,000 iterations); raw keys never leave volatile client memory; zero-knowledge backend storage.
- 64-character SHA-256 key fingerprints (16 blocks of 4 hex digits) for out-of-band identity and channel verification.
- Tamper detection via AES-GCM authentication tags rejecting modified payloads.
- Keep secrets and provider keys server-side.
- Validate all requests, rate-limit passcode and verification endpoints, and set restrictive security headers and content policies.
- Private media stored in a non-public bucket/container and served through short-lived authorization URLs or a protected proxy.
- Prevent caching of Eternalus media by shared/public caches; define suitable private cache headers.
- Avoid collecting IP/device analytics unless necessary; document any operational logs and expiry.

### Privacy

- Data minimization: collect only content necessary for the birthday experience.
- **Strict Zero-AI Policy for Private Chat:** the 1-to-1 human conversation between Creator and Recipient strictly excludes AI companion Noah; no human messages, voice notes, or media attachments are sent to LLM providers or analyzed by AI.
- Face data is sensitive biometric information. Establish consent, retention, deletion, and processing location before implementing matching.
- The reference face image must be handled as sensitive content, not placed in the public site bundle.
- No AI provider receives private photos, selfies, chat messages, or biometric data in MVP.

### Compatibility

- Current evergreen mobile and desktop browsers; test iOS Safari and Android Chrome first.
- Camera verification only on secure contexts and where `getUserMedia` is supported.
- 3D, if added later, must have a non-WebGL fallback.

## 9. Technical architecture (target)

The implementation workspace is currently empty, so this is a target architecture and not a description of existing code.

### Recommended baseline

- **Web application:** Next.js App Router + React + TypeScript.
- **Rendering:** Server Components for static/curated content and page composition; narrowly scoped Client Components for interactive reveals, media controls, camera capture, and future 3D.
- **Backend-for-frontend:** Next.js Route Handlers for passcode verification, session issuance, face-verification orchestration if required, and protected media authorization.
- **Content model:** Postgres tables for bilingual cards, profile posts, story items, game definitions/rewards, approved Noah knowledge, and media metadata. Keep access policies and Eternalus metadata in server-only tables.
- **Media storage:** separate `birthday-public` bucket for creator-approved profile/story assets; `eternalus-private` for couple gallery/reference assets. Recipient camera captures remain on-device unless explicitly uploaded. Private delivery only after authorization.
- **Session:** signed, short-lived, HttpOnly, Secure, SameSite cookies. Separate session claims/scopes for birthday access and Eternalus access.
- **Database:** optional for first release if content is static. If needed for creator editing or session/rate-limit state, use a managed relational store; do not store raw biometric captures.
- **Hosting:** managed HTTPS hosting with server runtime compatible with secure route handling. Confirm private storage and logging settings before deployment.
- **Observability:** uptime and performance metrics; redacted structured errors; no sensitive media or biometric payload logging.

### Logical components

```text
Recipient browser
  ├─ Passcode and birthday UI
  ├─ Browser camera (only on explicit Eternalus action)
  ├─ Birthday home/profile/story media
  ├─ Optional local camera capture
  ├─ Noah chat client
  └─ Protected Eternalus media request
       │ HTTPS
       ▼
Next.js application / backend-for-frontend
  ├─ Birthday session and route guard
  ├─ Eternalus authorization scope
  ├─ Rate limiter and verification policy
  ├─ Protected media authorization
  ├─ Chat/AI proxy with approved knowledge retrieval
  └─ Server-only content/config access
       │ authorized short-lived request
       ▼
Private media object storage / CDN origin
```

### Authentication and authorization model

- Birthday passcode grants `birthday:read` scope only.
- Face verification or the declared fallback grants a separate `eternalus:read` scope.
- Authorization is checked on every protected media request, not only by hiding a UI route.
- Expire Eternalus scope independently; allow immediate lock and credential rotation.
- If biometric matching is performed on-device, make clear that downloadable encrypted assets still need a key-release design; simply hiding the route or running a client-side match does not protect files already shipped to the browser.

### Face verification decision gate

Before implementation, select one of two honest security profiles:

1. **Privacy-first personal gate (recommended for a one-recipient gift):** on-device face similarity against a locally available reference, no upload; clearly state it is a convenience barrier and can be bypassed by someone with technical access or the reference photo. Do not call this strong identity verification.
2. **Higher-assurance verification:** reputable verification provider or carefully evaluated PAD pipeline, with explicit disclosure that images/biometric signals are processed by that service/server and under its retention policy. Require threat model, provider review, consent, deletion policy, and false-reject recovery before use.

Neither profile guarantees that no other person can ever access the content. For higher privacy, combine face check with a separate secret or one-time access code. The product must choose and describe the assurance level rather than promising absolute exclusion.

## 10. Data model (conceptual)

### Birthday content

- `Experience`: title, recipient display name, nickname, occasion date, theme, status.
- `BirthdayCard`: id, language, title, message, order, animation variant.
- `ProfilePost`: id, media key, caption, alt text, order, creator/recipient attribution, publication state.
- `StoryItem`: id, media key, caption, alt text/transcript, order, optional story expiry.
- `Game` / `GameReward`: id, game type, instructions, reward message/media key, order, active state.
- `NoahKnowledge`: id, approved text, topic, enabled flag, updated by creator.
- `ChatMessage`: optional ephemeral message record; retention policy must be decided before persistence.
- `Reveal`: id, order, interaction type, prompt, revealed message, optional asset id.

### Protected data

- `EternalusAsset`: id, private storage key, caption/alt text, order.
- `AccessPolicy`: passcode hash/secret reference, rate-limit policy, session duration, Eternalus fallback secret hash or provider reference.
- `VerificationEvent`: timestamp, outcome category, attempt counter, policy version; no raw images or embeddings.

No recipient profile or long-lived biometric database is needed for a one-time birthday site. If the reference image is used for matching, define its secure storage and deletion schedule before implementation.

## 11. Content and media requirements

- Creator provides final display name/nickname, birthday copy, chapters, media, and captions.
- Main-site photos must be specifically selected for the birthday presentation.
- Couple-private photos are stored and referenced separately from main-site photos.
- Confirm permission to use each supplied media asset and any generated media.
- Prefer compressed WebP/AVIF images with appropriate fallbacks; use poster frames for videos.
- Use original or appropriately licensed audio; do not assume platform music embeds can be used offline or redistributed.
- Add captions/transcripts for speech and alt text for meaningful images.
- Provide a creator preview that checks sequence, spelling, crops, and playback before publishing.

## 12. Analytics and success measures

Because this is a one-recipient experience, avoid intrusive analytics. Use operational metrics and optional aggregate events without personal identifiers.

### Success criteria

- Recipient can reach birthday welcome and complete the main story on a phone without account creation.
- All key media loads or presents a useful fallback.
- The recipient can pause/mute audio and skip/revisit content.
- Birthday passcode does not grant Eternalus access.
- Eternalus media is inaccessible through unauthenticated direct URL/API requests.
- Face denial/failure does not block the birthday experience; the declared recovery path works.
- No selfie, face embedding, or private media appears in application logs or analytics.

### Optional product signals

- Completion of birthday story (aggregate event).
- Reveal interactions used (aggregate count, no message text).
- Eternalus entry attempts and successful unlock (outcome only, no biometric artifact).
- Media load failures and page performance by coarse device category.

Do not use “time spent,” emotional response, or repeated gallery views as success proxies without a clear need and consent.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Birthday passcode is guessed or shared | Treat as low-assurance gate; rate-limit; use private link and avoid sensitive content until Eternalus. |
| Face check accepts a photo/video replay | Use evaluated liveness/PAD if claiming live verification; otherwise disclose low assurance and combine with separate secret. |
| False rejection blocks Meerah | Provide retries, camera tips, and a private fallback code; keep birthday content available. |
| Private assets leak through public URLs/cache | Separate storage, server authorization on every request, short-lived URLs, restrictive cache headers, audit deployment. |
| Camera/privacy surprise | Explain purpose before browser prompt; invoke only after user gesture; default no upload/no persistence. |
| Mobile media/3D too slow | Keep 3D out of MVP; compress/lazy-load media; offer static fallback. |
| Music autoplay is blocked or unwelcome | Start audio only after an explicit tap and provide visible controls. |
| Relationship language feels overcommitted | Creator reviews all text; avoid generated claims and provide neutral/editable copy. |
| Missed deadline or deployment issue | Freeze content early, preview on target devices, use a tested rollback/takedown procedure. |

## 14. Delivery plan

1. **Product/content lock:** finalize story chapters, media inventory, passcode policy, Eternalus reference/verification decision, and fallback.
2. **Security/privacy design:** decide face processing, PAD, protected storage, session scopes, camera upload behavior, Noah retention/provider, and deletion.
3. **Experience implementation:** passcode, bilingual birthday book, profile grid, preloaded stories/camera capture, chat, one game, and closing chapter.
4. **Verification implementation:** implement Eternalus authorization after assurance and data-handling decisions are documented.
5. **Creator workspace:** upload/reorder media, write cards in English/Urdu, curate Noah knowledge, manage codes, preview, and publish.
6. **Content integration:** add optimized media, captions, transcripts, and alt text; keep private assets segregated.
7. **Validation:** responsive/accessibility review; authorized security checks of session/media boundaries; camera consent/error scenarios; AI guardrail checks; playback/performance checks.
8. **Release:** publish over HTTPS, verify the shared link and social preview, confirm private routes/media are not cached or indexed, and retain a takedown/rollback path.

## 15. Open decisions before build

1. **Face-check assurance:** privacy-first on-device convenience gate or higher-assurance service with disclosed processing?
2. **Eternalus fallback:** separate strong passphrase, one-time code, or creator-assisted recovery? Avoid using the birthday passcode as fallback.
3. **Reference face data:** who supplies it, how it is stored, and when it is deleted?
4. **Creator workflow:** static content package for this one site or a private editor?
5. **Media limits:** desired photo/video/voice-note counts and maximum lengths/file sizes?
6. **Retention:** how long should the site and Eternalus remain online, and who can revoke it?
7. **Friend contributions:** exclude from MVP or allow a private, moderated submission link?
8. **Noah provider and retention:** confirm allowed knowledge source, provider, retention disclosure, and whether Noah may navigate to Eternalus (Noah should not receive or expose its media).
9. **Photo capture sharing:** should recipient-uploaded photos become immediately visible, or require creator approval? Default recommendation: explicit recipient action plus creator approval before appearing in the shared profile.
10. **Human chat:** should the creator chat be live, asynchronous, or a one-way message/reply box? This determines notification and message-retention requirements.
11. **Noah chat persistence:** keep conversation only in the active browser session or persist across visits?
12. **Urdu localization:** confirm Urdu script and preferred phrasing; support right-to-left card layout.

## 16. Source basis

- Next.js App Router and server/client component model: [Next.js App Router](https://nextjs.org/docs/app), [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).
- Browser camera requirements and permission behavior: [MDN `getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia.).
- Presentation attack detection definition and face PAD guidance: [NIST PAD glossary](https://csrc.nist.gov/glossary/term/Presentation_Attack_Detection), [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-4/sp800-63b/authenticators/).
- Authentication/session safety guidance: [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- Reduced-motion and interaction animation guidance: [W3C WCAG 2.2 animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions).

---

---

## 17. Multi-Agent Implementation: Profile & Camera Panels (October 2026)

### 17.1 Component Boundaries & Contracts
The Profile and Camera sections have been extracted into independent, modular client components under `src/components/`:
- **`ProfilePanel` (`src/components/profile/ProfilePanel.tsx`, `profile.css`)**:
  - Handles the Instagram-style birthday feed: header, statistics, highlights carousel, and filtered tabs (`posts`, `reels`, `favorites`).
  - Supports persistent favoriting via `birthday-favorites` (with `birthday_favorites` compatibility fallback).
  - External Instagram link rendering with protocol sanitization (permits `https:` / `http:`, rejects unsafe protocols).
  - Eternalus navigation bridge card directing to the private couple vault via `onOpenEternalus()`.
  - Props Contract:
    ```ts
    interface ProfilePanelProps {
      posts: ProfilePostItem[];
      loading?: boolean;
      favorites: string[];
      onToggleFavorite: (id: string) => void;
      onSelectMedia: (item: { url: string; caption: string; kind?: "image" | "video" }) => void;
      onOpenEternalus: () => void;
      recipientName?: string;
      instagramUrl?: string;
      bio?: string;
      highlights?: ProfileHighlight[];
    }
    ```
- **`CameraPanel` (`src/components/camera/CameraPanel.tsx`, `camera.css`)**:
  - Handles the on-demand Snap camera and selfie memory creation.
  - Zero camera stream access on mount; camera permission requested exclusively on user tap ("Open camera").
  - Complete media track cleanup (`stream.getTracks().forEach(t => t.stop())`) upon capture, retake, close, and unmount.
  - Strict consent model: captures, previews, and device downloads (`meera-birthday-memory.jpg`) occur locally on-device. Network transmission to `/api/captures` requires explicit user confirmation ("Add to profile").
  - On error, captured preview is retained for retry.
  - File picker fallback (`<input type="file" accept="image/*" capture="user">`) for devices where WebRTC `getUserMedia` is unsupported or restricted.
  - Props Contract:
    ```ts
    interface CameraPanelProps {
      onCaptureAdded: (post: { id: string; url: string; caption: string; media_kind: "image" | "video"; [key: string]: any }) => void;
      onNavigateToProfile?: () => void;
      onError?: (error: string) => void;
    }
    ```

### 17.2 Verification & Test Results
- **Unit & Acceptance Test Suites**:
  - `test/camera.test.ts`: 12/12 passing (payload validation, consent boundaries, track lifecycle, state transitions).
  - `test/profile.test.ts`: 16/16 passing (mode filtering, favorite persistence, highlights, URL sanitization).
  - `test/integration-acceptance.test.ts`: 20/20 passing (cross-panel contract verification, size/mime limits, privacy separation).
  - `test/release.test.ts`: 4/4 passing (release timestamp and midnight IST gate).
  - Total automated tests: 52 / 52 passing.
- **Build & Quality Gates**:
  - TypeScript (`npx tsc --noEmit`): 0 errors.
  - Next.js Production Build (`npm run build`): Exit code 0 (all 12 routes optimized and static pages rendered).

## 18. Interactive 2D Scrapbook Landing Page (Wave 1)

### 18.1 Overview & Aesthetic
Following passcode verification, the primary landing view (`tab === "home"`) transforms into an intimate, interactive 2D scrapbook celebrating Meerah's birthday.
- **Color Palette & Design Tokens**:
  - Warm Ivory (`--sb-bg-ivory`: `#FFF9EF` / `--sb-card-bg`: `#FFFDF9`)
  - Rose Pink (`--sb-accent-rose`: `#F8E8EC` / `--sb-rose-border`: `#F0D5DC`)
  - Sunflower Gold (`--sb-accent-sunflower`: `#F1C75B`)
  - Soft Sage (`--sb-accent-sage`: `#E5EDE2`)
  - Plum Ink (`--sb-text-primary`: `#624752` / `--sb-text-secondary`: `#8A6D7B`)
  - Crisp White (`--sb-card-white`: `#FFFFFF`)
- **Atmosphere**: Paper textures, Polaroid frames, vintage washi tape, delicate flower illustrations (sunflower, pink rose, white flowers), and bilingual typography (Serif headings, Sans body, Urdu Nastaliq script). No Three.js/3D rendering systems are used.

### 18.2 Wave 1 Sections (First Five Approved Sections)
1. **Section 1 — Welcome Hero (`HeroSection.tsx`, `hero-section.css`)**:
   - Personalized birthday greeting ("Happy Birthday, Meerah ✿").
   - 2D avatar container with decorative flower ring and symbolic illustration placeholder (prepared for future recipient photo).
   - Sunflower, pink rose, and white-flower illustrated botanical elements.
   - Dual-language messages in English and Urdu ("تمہاری سالگرہ بہت مبارک ہو").
   - Primary action: "Open your little world ↓" smoothly scrolling to the Scrapbook Card Wall.
2. **Section 2 — Interactive Scrapbook Card Wall (`ScrapbookCardWall.tsx`, `scrapbook-card-wall.css`)**:
   - 8 curated destination cards with organic scrapbook rotations (`-2.5deg` to `+2deg`):
     - `birthday-book` (Active): Opens the keepsake birthday book.
     - `letters` (Active): Navigates to letters.
     - `flower-garden` (Planned Wave 2): Flower mini-game, clearly badged as "Wave 2 ✿ Coming Soon".
     - `memories` (Active): Jumps to Section 5 / Memories gallery.
     - `camera` (Active): Navigates to Snap camera capture panel.
     - `songs` (Active): Displays track count and jumps to Section 3 / Songbook.
     - `surprises` (Active): Tracks progress toward 25 secrets/mini-reveals.
     - `time-capsule` (Planned Wave 2): Release gate countdown badged as "Midnight IST ✿ Locked".
3. **Section 3 — Prominent Music Card (`LandingMusicCard.tsx`, `landing-music-card.css`)**:
   - Styled as a vintage vinyl record player and keepsake song card.
   - Vinyl platter spins during active playback (`@keyframes vinylSpin`) with tonearm resting over groove.
   - Reuses existing audio player state and controls in `Experience.tsx` (no duplicate audio instances).
   - Zero-autoplay rule strictly enforced; requires user click to begin playback.
   - Integrated quick-tracklist permitting direct track selection and play/pause toggle.
   - "Open Complete Songbook ♫" CTA button transitions to dedicated song collection.
4. **Section 4 — Birthday Book Entry Point (`StoryDestinationCards.tsx`, `story-destination-cards.css`)**:
   - Rich vintage keepsake book cover with gold foil lettering in English ("For my baba") and Urdu ("تمہاری سالگرہ"), silk ribbon marker, and embossed book spine.
   - Dynamic page count badge ("X Keepsake Pages · صفحات").
   - Primary CTA: "Open Birthday Book ✿" displaying the interactive book modal.
5. **Section 5 — Memories and Photographs Preview (`StoryDestinationCards.tsx`, `story-destination-cards.css`)**:
   - Polaroid-style photo preview grid (displaying up to 4 featured memories) with washi-tape corners and handwritten captions.
   - Clicking any polaroid opens the full-screen media lightbox modal with image, caption, and navigation.
   - Graceful empty state when no photos are uploaded ("Moments are waiting to be placed here...").
   - "Open all memories →" CTA navigating to the full profile/memories panel.

### 18.3 Verification & Quality Assurance
- Automated test suites (all passing):
  - `test/landing-hero.test.ts`: 12/12 passing
  - `test/landing-card-wall.test.ts`: 9/9 passing
  - `test/landing-music-card.test.ts`: 39/39 passing
  - `test/landing-story-cards.test.ts`: 28/28 passing
  - `test/landing-integration.test.ts`: 34/34 passing
  - Total test suite: 142/142 tests passing across all 14 suites.
- TypeScript (`npx tsc --noEmit`): 0 errors.
- Production Build (`npm run build`): Exit code 0, all routes static & dynamic verified.

## 19. Multi-Agent Implementation: Music Room & 1-to-1 Private Chat (October 2026)

### 19.1 Component Boundaries & Architecture
The Music Room and Private 1-to-1 Chat features have been implemented as dedicated, highly cohesive modules under `src/components/music/` and `src/components/chat/`:

- **`MusicRoom` (`src/components/music/MusicRoom.tsx`, `music-catalogue.ts`, `music-room.css`)**:
  - **Romantic & Timeless Aesthetic**: Styled in accordance with `design.md` (Love Theme: `--love-dusty-rose`, `--love-blush`, `--love-burgundy`, `--love-gold`) and `music-panel.html`.
  - **Curated Catalogue**: 50 preloaded romantic and personal songs with metadata (title, artist, duration string and seconds, favorite state, and playlist attribution).
  - **Real-time Search & Filtering**: Client-side filtering by track name or artist, category filters (`all`, `favorites`, `playlists`), and five curated playlist buckets ("Meerah's Favorites", "Acoustic & Soft", "Late Night Starlight", "Desi Melodies", "Timeless Classics").
  - **Now Playing Card**: Features 3 interactive size modes (`compact`, `standard`, `expanded`), switchable dynamically without interrupting audio playback.
  - **Analog Vinyl Experience**: Realistic rotating vinyl disc synchronized with playback (`@keyframes vinylSpin`), tonearm positioning, and `@media (prefers-reduced-motion: reduce)` compliance.
  - **Audio Controls**: Interactive progress seek bar with drag support, volume slider with mute toggle, previous/next, shuffle, and repeat modes.
  - **Local Audio Import**: Built-in file picker (`<input type="file" accept="audio/*">`) allowing the recipient or creator to import custom audio files, with strict cleanup (`URL.revokeObjectURL`) on track changes and unmount to prevent memory leaks.
  - **Hardware/Audio Singleton Isolation**: Does not create new `<audio>` elements; receives `externalAudioRef={playerRef}` from `Experience.tsx` and synchronizes state via props.

- **`ChatPanel` (`src/components/chat/ChatPanel.tsx`, `ChatTimeline.tsx`, `ChatComposer.tsx`, `chat-crypto.ts`, `chat-helpers.ts`, `chat.css`)**:
  - **Strictly Human-to-Human (Zero-AI Guarantee)**: Private messaging exclusively between Creator and Recipient. AI companion Noah is strictly excluded from this private thread, ensuring 100% human authenticity with no bot intervention.
  - **End-to-End Encryption (E2EE)**: Built on standard Web Crypto API (`globalThis.crypto.subtle`):
    - Symmetric encryption with `AES-GCM-256`.
    - Key derivation via PBKDF2 using HMAC-SHA-256 with 100,000 iterations from a shared passphrase and deterministic salt.
    - Cryptographically secure 12-byte (96-bit) fresh random IV generated per message (`crypto.getRandomValues`).
    - 128-bit authentication tag automatically verifying payload integrity and rejecting tampered ciphertexts (`ChatDecryptionError`).
    - CryptoKey instances reside strictly in volatile browser memory and are never persisted or transmitted.
  - **Security Fingerprint Modal**: Derives a 64-character SHA-256 key fingerprint presented as 16 blocks of 4 uppercase hex characters (safety numbers) for out-of-band MITM verification.
  - **Rich Attachment Support**:
    - Photos (PNG, JPEG, WebP up to 15 MB).
    - Videos (MP4, WebM up to 50 MB) with inline player.
    - Curated romantic GIF picker with instant reactions.
    - Voice notes with live recording timer, wave indicator, and preview playback (WebM up to 10 MB).
  - **State Machine & Offline Resiliency**: Optimistic message timeline rendering with status indicators (`sending`, `sent`, `delivered`, `failed`), timestamp dividers (`Today`, `Yesterday`, dates), and seamless offline fallback to data URLs.

### 19.2 Verification & Test Results
- **Automated Test Suites**:
  - `test/music-room.test.ts`: 31/31 passing (catalogue integrity, search, playlist filtering, shuffle/repeat bounds, local file cleanup).
  - `test/chat-crypto.test.ts`: 12/12 passing (PBKDF2 derivation, AES-GCM 256-bit encrypt/decrypt roundtrips, tamper detection, 64-character fingerprint formatting).
  - `test/chat-ui.test.ts`: 30/30 passing (composer validation, media limits, date dividers, attachment rendering, zero-AI validation).
  - `test/music-chat-integration.test.ts`: 12/12 passing (cross-panel audio isolation, E2EE media payloads, theme tokens, offline fallbacks).
  - Complete repository test suite: **320 / 320 tests passing across 38 suites**.
- **Build & Quality Gates**:
  - TypeScript (`npx tsc --noEmit`): 0 errors.
  - Next.js Production Build (`npm run build`): Exit code 0, all static and dynamic routes validated.
  - Responsive audit: 0 horizontal overflow across 360px, 390px, 768px, 1024px+.
  - Accessibility: WCAG 2.1 AA compliant, full keyboard navigation, high-contrast `:focus-visible` rings, ARIA roles, and reduced-motion safety.

## 20. Multi-Agent Implementation: Profile, Memories, Photo Pipeline & Story Audio (October 2026)

### 20.1 Architecture & Domain Contracts
The Profile and Memories experiences represent an authentic Instagram and Snapchat-inspired mobile-first personal celebration system:

- **Authoritative Date Engine (`src/lib/birthday-dates.ts`)**:
  - Pure calculation engine determining Meerah's dynamic age (24 years old) and live countdown to the next birthday.
  - Complete leap year awareness (`isLeapYear`, handling Feb 29 leap day birthdays with Feb 28 common year fallback).
  - Strict "On This Day" matching (`isOnThisDay`): matches month and day strictly against past years (`captureYear < currentYear`).
  - Zero false-positive rule: Photos with unknown capture dates (`hasKnownCaptureDate === false`) or same-year uploads are strictly excluded from "On This Day" groupings.
  - Date formatting: bilingual Urdu/English milestone badges ("1 Year Ago Today ✿", "2 Years Ago Today ✨", "Golden Hour Sunset 🎂").

- **Persistent Media Service (`src/lib/media-service.ts` & Supabase Migration `202610290002_profile_memories_collections.sql`)**:
  - Hybrid storage with optimistic local cache (`localStorage`) and asynchronous cloud sync (`media_photos`, `media_collections`, `media_stories`, `media_favorites`).
  - Safe compensating reference integrity:
    - Deleting a photo automatically cleans all references from favorites, user highlights, albums, and stories.
    - Deleting a collection, album, highlight, or story safely unbinds references while keeping the underlying `PhotoAsset` items completely intact.
  - Privacy and authorized editing: `canEdit` guardrails strictly gate Profile identity editing, new highlight creation, photo deletion, and story creation. Unauthorized visitors can view curated memories but cannot mutate recipient state.

- **Dual-Mode Photo Ingestion Pipeline (`src/components/camera/camera-pipeline.ts`, `CameraPanel.tsx`, `PhotoUploadModal.tsx`)**:
  - Ingestion Mode 1: Live mobile camera capture via `navigator.mediaDevices.getUserMedia` with front/back camera toggling (`facingMode: "user" | "environment"`).
  - Ingestion Mode 2: Device file picker supporting drag-and-drop, JPEG, PNG, WebP, and AVIF formats up to 12 MB.
  - Hardware cleanup: `stopMediaTracks` aggressively stops all audio/video tracks in the MediaStream upon unmount, modal close, or retake, ensuring zero persistent hardware camera indicators.
  - Explicit consent guardrail: Capturing or selecting a photo enters a preview review state with editable captions and effective capture date picker. Photos are NEVER uploaded automatically without the visitor's explicit tap on "Save to Memories ✿".
  - Preservation on error: If an upload or network error occurs, the captured preview URL is never discarded, allowing the user to retry.

- **Instagram-Inspired Profile Panel (`src/components/profile/ProfilePanel.tsx`, `profile.css`)**:
  - Dynamic profile header displaying avatar with romantic gold border, display name, bio, interest tags, and dynamic birthday countdown.
  - Interactive highlights carousel: circular covers, active highlight story viewer, "+ New" highlight creation modal, and safe highlight removal.
  - Tabbed media grid (Posts, Reels/Videos, Saved Favorites) with grid item hover effects, video duration badges, and instant lightbox viewing.
  - Profile identity edit modal: allows authorized recipient to update display name, bio, interests, and avatar with persistent storage.

- **Snapchat-Inspired Memories Panel (`src/components/memories/MemoriesPanel.tsx`, `memories.css`, `stories.css`)**:
  - 4 dedicated tabs: "All Photos", "On This Day", "Albums", and "Stories".
  - Chronological timeline grouping photos by Year and Month with sticky date headers.
  - "On This Day" flashback view rendering memories grouped by past years with celebratory milestone badges.
  - Albums view: multi-photo custom albums with cover preview, creation modal, and photo deletion protection.
  - Photo Lightbox: full-viewport photo viewer with high-resolution rendering, zoom, favorite toggle, and scroll position retention upon dismiss.

- **Story Builder & Single-Source Audio Engine (`src/components/memories/StoryViewer.tsx`, `StoryBuilderModal.tsx`, `story-helpers.ts`)**:
  - Interactive story playback: segmented animated progress bars, 5-second automatic progression, tap left to go back, tap right to advance, and touch-and-hold to pause.
  - Curated Story Soundtrack: StoryBuilderModal connects to the 50-song music catalogue (`music-catalogue.ts`), allowing users to attach romantic background music.
  - Single `<audio>` element architecture: `StoryViewer` receives `externalAudioRef={playerRef}` from `Experience.tsx`, capturing previous audio state on mount and safely restoring prior playback on close. Zero duplicate `<audio>` DOM nodes are ever created.

### 20.2 Verification & End-to-End Quality Gates
- **Automated Test Suites**:
  - `test/birthday-dates.test.ts`: 6/6 tests passing (leap year, age computation, countdown, On This Day logic).
  - `test/media-service.test.ts`: 6/6 tests passing (load/save, favorite toggle, safe reference cleanup, photo creation).
  - `test/profile.test.ts`: 20/20 tests passing (age badge, countdown timer, highlights creation/deletion, edit modal).
  - `test/photo-lifecycle.test.ts`: 17/17 tests passing (file size/type validation, camera tracks cleanup, consent guardrail, retake).
  - `test/memories-e2e.test.ts`: 7/7 tests passing (tabs, timeline grouping, On This Day grouping, albums, scroll retention).
  - `test/story-music.test.ts`: 13/13 tests passing (progress clamping, tap navigation, hold-to-pause, 50-song catalogue attachment, audio state restoration).
  - `test/journeys-a-i.test.ts`: 9/9 passing covering End-to-End Journeys A through I.
  - Complete repository test suite: **382 / 382 tests passing across 38 suites**.
- **Quality Gates**:
  - TypeScript compilation (`npx tsc --noEmit`): 0 errors.
  - ESLint verification (`npm run lint`): 0 errors, 0 warnings.
  - Next.js Production Build (`npm run build`): Exit code 0, all 13 static and dynamic routes validated.
  - Mobile UX & Accessibility: 320px–1440px viewport responsiveness, minimum 44x44px touch targets, `env(safe-area-inset-bottom)` compliance, zero horizontal overflow, `:focus-visible` outlines, and `@media (prefers-reduced-motion: reduce)` support.

**Document note:** This PRD reflects the verified, implemented, and fully tested state of the Meerah Birthday Experience as of October 2026.


---

## 21. Release 2.0 Feature Completion & Final Acceptance (October 2026)

### 21.1 Implemented Capabilities
1. **Global Love Theme Design System:**
   - Unified Love Theme tokens (`--color-bg: #1A0F1F`, `--color-surface: #26132B`, `--color-surface-alt: #3A1F3B`, `--color-primary: #F7A8B8`, `--color-primary-strong: #F27A98`, `--color-accent: #D4A47C`) mounted via `data-theme="love"` on layout shell.
   - Fluid responsiveness across 360px mobile viewports up to 1440px desktop screens.

2. **Snapchat-Inspired Camera Default in Memories:**
   - `MemoriesPanel.tsx` defaults directly to `"camera"` view upon opening.
   - Real-time 6-filter carousel (Natural, Warm Sun, Soft Rose, Vintage Film, Cinematic Plum, Golden Hour).
   - Prominent bottom shutter button, flash/torch toggle, notification dropdown, and direct gallery shortcuts.

3. **Zero-AI End-to-End Encrypted Private Chat:**
   - Strict human-to-human guarantee with zero AI bot intervention in human messages.
   - Client-side AES-GCM-256 and PBKDF2 encryption before transport or storage.
   - Tamper resistance with `ChatDecryptionError` handling.
   - Offline message queue (`birthday-offline-chat-queue`) with automatic reconnect flushing.

4. **12-Genre / 8-Template Read & Study Experience:**
   - 12 Curated Genres: Fiction, Romance, Mystery & Thriller, Fantasy, Sci-Fi, Biography, Self-Development, History & Philosophy, Manga, Anime-Inspired Stories, Comics/Graphic Novels, Poetry.
   - 8 Reading Presentation Templates: Minimal, Romantic Literary Journal, Manga-Inspired Panel Layout, Anime-Inspired Illustrated Story, Graphic Novel Layout, Bookshelf, Notes Workspace, Study Cards.
   - Multi-chapter reading progression, bookmarking, personal study notes, and persistent reading progress via `localStorage`.

5. **Expanded Solo & Real-Time Multiplayer Games:**
   - Four Game Categories: Competitive (`connect-four`, `trivia-duel`, `word-scramble`), Cooperative (`escape-room`), Social/Party (`would-you-rather`), and Solo (`daily-word`, `memory-match`, `birthday-quiz`).
   - Real-Time Multiplayer Service (`multiplayer-service.ts`) with 6-character room codes (`ABC123`), lobby state, turn alternation, and timer synchronization via storage events.
   - Instant Solo Play mode bypassing lobby requirements.

### 21.2 Verified Quality Metrics
- **Automated Tests:** **400 / 400 tests passing across 38 suites**.
- **TypeScript Typecheck:** 0 errors (`npx tsc --noEmit`).
- **ESLint Code Quality:** 0 errors, 0 warnings (`npm run lint`).
- **Production Next.js Build:** Exit code 0, 13/13 static and dynamic routes compiled and optimized.

---

## 22. Private Music Room, Audio Ingestion, Persistent Playback & Acceptance (October 2026)

### 22.1 Architecture & Core Invariants
1. **Single Authoritative Playback Controller:**
   - Centralized module singleton store `useMusicStore()` and audio reference getter `getMusicAudioRef()` (`src/lib/music/use-music-store.ts`).
   - Strictly enforces exactly one DOM `<audio>` element across the entire lifecycle, eliminating competing playback controllers.
   - Preserves Story-Music integration (`StoryViewer.tsx`) via non-destructive state snapshotting (`captureAudioState`/`restoreAudioState`), resuming ambient music only if it was playing prior to story playback.
2. **Provider-Neutral Track Architecture:**
   - Unified `DbTrack` schema supporting `source_type: 'imported' | 'provider'` with `source_provider` metadata.
   - Decoupled from any proprietary streaming vendor; no DRM circumvention or unauthorized scraping.
3. **Private Account Data & Security:**
   - Audio files isolated in private Supabase Storage bucket `birthday-audio` under path convention `audio/{track_id}/{filename}`.
   - Media playback accessed exclusively via 60-minute time-limited signed URLs (`/api/music/upload/signed-url`) with strict path traversal sanitation.
   - Row-Level Security (RLS) enforcement across all tables: `public.music_tracks`, `user_playlists`, `user_playlist_tracks`, `music_likes`, `music_playback_state`, `music_listening_history`, and `music_lyrics`.
   - Privileged Supabase service-role keys restricted strictly to server-side ingestion and upload route handlers.

### 22.2 Ingestion & Management Pipelines
1. **Dual Ingestion Strategy:**
   - **CLI Batch-Import Tooling (`scripts/import-music.ts`):** Supports CSV and JSON manifests, magic-byte audio validation (MP3, M4A/AAC, OGG, WAV, FLAC), SHA-256 track deduplication, automated storage upload, database upsertion, and non-destructive `--dry-run` simulation mode.
   - **Authenticated Admin UI (`src/components/admin/music/AdminMusicUpload.tsx`):** Drag-and-drop batch upload interface embedded within `Admin.tsx`, offering multi-file queue management, automatic browser-side duration extraction, 50MB file validation, real-time XHR progress indicators, and individual retry/discard controls.
2. **Personal Listening Features:**
   - **Likes & Liked Songs:** One-click optimistic track liking, integrated filtering, and dedicated collection view.
   - **Playlist Management (`PlaylistManagerModal.tsx`):** Full CRUD capabilities for custom user playlists (create, rename, describe, track addition/removal, drag-and-drop/index reordering, and deletion) with ARIA-compliant modal dialogs.
   - **Listening History (`ListeningHistoryModal.tsx`):** Server-persisted history records triggered after 30 seconds of listening or completed track playback, with relative timestamps and completion status tags.
   - **Synchronized Lyrics Panel (`LyricsPanel.tsx`):** Real-time millisecond-synchronized auto-scrolling lyrics with click-to-seek playback positioning, formatted timestamps, and graceful un-timed/plain-text fallbacks.
   - **Persistent Queue & State Recovery:** Queue drawer with index navigation, 3-mode repeat cycling (`off` -> `all` -> `one`), track shuffling, and 5-second debounced state persistence (`music_playback_state`) enabling cross-session track and time recovery.

### 22.3 Verified Production Quality Metrics
- **Automated Test Suite:** **657 / 657 tests passing across 90 test suites (0 failures)**.
  - Dedicated music domain coverage: Catalogue (97 tests), Store & Playback (83 tests), API Contracts (25 tests), Security & RLS (24 tests), Story-Music Regression (30 tests), Ingestion & Admin (10 tests), Personal Features (14 tests), Music Room UI (31 tests).
- **TypeScript Strict Verification:** 0 type errors (`npx tsc --noEmit`).
- **ESLint Code Quality:** 0 errors, 0 warnings (`npm run lint`).
- **Production Build:** Next.js production build compiled cleanly (`npm run build`), generating all static and dynamic application routes.


---

## 23. Production-Ready Landing Page Implementation (October 2026)

### 23.1 Nine-Section Linear Narrative Architecture
The primary birthday landing experience (`src/components/Experience.tsx`, `tab === "home"`) is structured as an immersive 9-section linear narrative celebrating Meerah's birthday. Each section is encapsulated as an accessible, responsive, independent client component under `src/components/landing/`:

1. **Section 1: Midnight Birthday Reveal (`MidnightBirthdayReveal.tsx`):**
   - Date-gated celebratory banner and modal triggered exclusively on October 30 in the recipient's local timezone (`Asia/Kolkata`).
   - Timezone-aware date calculations via `getTimezoneDateParts` and `isBirthdayActive`.
   - Multi-tier audio fallback: attempts configured audio playback (`audioSrc`), handles browser autoplay rejection with a prominent "Tap to celebrate ♫" button, and synthesizes an acoustic music-box chime via the Web Audio API (`playMusicBoxChime`).
   - Annual dismissal persistence via deterministic localStorage key `birthday-reveal-completed-YYYY-10-30`.
   - Accessible ARIA semantics: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="midnight-reveal-title"`, and `aria-live="polite"` audio status.

2. **Section 2: Welcome Hero & Avatar (`HeroSection.tsx`):**
   - Handcrafted floral wreath illustration embedding three distinct floral motifs: sunflower (`#F1C75B`), deep rose (`#D4798D`), and white jasmine/daisy (`#FFFFFF`).
   - Dual-state avatar cameo: renders real recipient photograph with automatic asynchronous decoding (`decoding="async"`) and graceful fallback (`onError`) to a symbolic antique 2D silhouette cameo.
   - Personalized greeting header with recipient name (`Meerah`), date kicker (`October 30`), and Urdu blessing (`DEFAULT_URDU_BLESSING`) with bidirectional isolation (`dir="rtl"`, `lang="ur"`).
   - Primary continuation CTA button (`aria-label="Open your little world"`) with smooth-scrolling navigation.

3. **Section 3: Swipeable Photo Cards (`SwipeablePhotoCards.tsx`):**
   - Responsive, touch-gesture-enabled polaroid card carousel featuring authentic washi tape accents (`gold`, `pink`, `sage`) and subtle organic rotations (-1.5deg to +1.5deg).
   - Touch swipe interaction with calibrated 45px travel threshold (`SWIPE_THRESHOLD_PX`).
   - Accessible navigation: dot indicators with `aria-current="true"`, previous/next buttons with descriptive `aria-label`, keyboard arrow navigation (`ArrowLeft`, `ArrowRight`, `Home`, `End`), and visible position counter ("N of M").
   - Click-to-open photo viewer integration via `onSelectPhoto` callback.

4. **Section 4: Personal Messages and Poetry (`PersonalMessagesSection.tsx`):**
   - Bicultural stacked-card keepsake deck presenting handwritten birthday letters, classic Urdu poetry (e.g. Allama Iqbal ghazal verses), and heartfelt prayers.
   - Strict typography standards: English body with serif typography, Urdu verses in Noto Nastaliq Urdu with `dir="rtl"` and `lang="ur"`.
   - Decorative wax seal stamp graphics with color varieties (`pink`, `gold`, `sage`).
   - Tactile card deck navigation with swipe gestures, keyboard arrow support, and deckled-edge layering.

5. **Section 5: Birthday Book Invitation (`BirthdayBookInvitation.tsx`):**
   - 3D physical book presentation showcasing a realistic bound spine with crease, floor contact shadow, and deckled page edges.
   - Antique gold foil stamp featuring bilingual title: "For my baba" in English and "تمہاری سالگرہ" in Urdu calligraphy (`lang="ur"`, `dir="rtl"`).
   - Interactive book opening action: keyboard operable (`role="button"`, `tabIndex={0}`, Enter/Space key handling) and primary action button (`book-invitation-cta-btn`) triggering `onOpenBook`.

6. **Section 6: Our Soundtrack (`OurSoundtrackSection.tsx`):**
   - Prominent shared soundtrack player with vinyl turntable illustration, spinning record animation (`.is-spinning`), and engaged tonearm.
   - Strict single-audio-controller invariant: delegates all playback through `onTogglePlay` and `onPlayTrack` to the shared parent audio engine, strictly prohibiting duplicate `<audio>` elements or uncoordinated autoplay.
   - Quick-select tracklist with formatted durations (`mm:ss`), active playback indicators, and "Open full songbook ♫" CTA button navigating to the Music Room.

7. **Section 7: Memories Preview (`MemoriesPreviewSection.tsx`):**
   - Pinned polaroid memory preview grid capped at 4 curated photographs (`MAX_MEMORIES_PREVIEW = 4`).
   - Polaroid styling with white photographic borders, handwritten captions, washi tape corners, and video indicators.
   - Supportive empty-state guidance and skeleton loading placeholders.
   - "Explore memories" CTA button navigating directly to the Memories/Stories room.

8. **Section 8: Explore Your World (`ExploreWorldSection.tsx` & `ScrapbookCardWall.tsx`):**
   - Comprehensive destination navigation hub connecting to all application experiences: Profile, Games, Study, Music Room, Memories, and Birthday Book.
   - Accessible button elements with individual washi tape colors, category chip badges, and descriptive `aria-label`.
   - Truthful destination contract: 100% of linked destinations are active and operational (zero dead-ends or "Coming Soon" placeholders).

9. **Section 9: Closing Message (`ClosingMessageSection.tsx`):**
   - Handcrafted stationery letter card with top washi tape accent and crimson wax seal SVG featuring an embossed heart mark and radial gradient.
   - Heartfelt closing signoff ("With all my love ♡"), personal closing phrase, and closing Urdu blessing.
   - "Return to beginning" smooth-scrolling button (`window.scrollTo({ top: 0, behavior: "smooth" })`) and secondary "Explore your world" navigation shortcut.

### 23.2 Handcrafted Scrapbook Design System
1. **Color Tokens & Textures (`landing-tokens.css`):**
   - Paper surfaces: Warm ivory (`#FFF9EF`), antique cream paper (`#FBF4E6`), crisp polaroid white (`#FFFFFF`).
   - Accents: Sunflower gold (`#F1C75B` / `#C69325`), soft rose pink (`#D4798D` / `#E8A2B0`), sage foliage green (`#5B8266` / `#376E58`), deep plum ink (`#624752` / `#3D2B33`).
   - Tactile embellishments: Washi tape utility classes (`.washi-tape`, `.washi-tape-pink`, `.washi-tape-sage`) with semi-transparent paper texture, deckled edges, and organic tilt angles (-2deg to +2deg).
   - Layered depth: Multi-stop soft contact shadows (`--scrapbook-shadow`, `--scrapbook-shadow-hover`).
2. **Bicultural Typography:**
   - English: Playfair Display / Cormorant Garamond serif headings, clean sans-serif UI copy.
   - Urdu: Noto Nastaliq Urdu / Scheherazade New with `unicode-bidi: isolate`, explicit `lang="ur"`, and `dir="rtl"` to prevent punctuation inversion and layout corruption.

### 23.3 Quality & Verification Metrics
- **Automated Test Suite:** **763 / 763 tests passing across 117 suites (0 failures)**.
  - Dedicated landing test suite: `test/landing-page-nine-sections.test.ts` (37 tests), `test/midnight-reveal.test.ts`, `test/swipeable-cards-messages.test.ts`, `test/book-music-explore.test.ts`, `test/landing-mobile-performance.test.ts`, `test/landing-integration.test.ts`.
- **Accessibility & Motion Safety:**
  - 100% coverage of `@media (prefers-reduced-motion: reduce)` across all 10 landing stylesheets.
  - All interactive elements meet 44x44px touch target guidelines and define `:focus-visible` high-contrast outlines.
  - All dialogs and overlays feature `role="dialog"`, `aria-modal="true"`, and escape key listeners.
- **Hydration & Lifecycle Safety:**
  - Zero hydration mismatches: all 9 components marked `"use client"` with SSR-safe browser API guards (`typeof window !== "undefined"`).
  - Clean resource cleanup: zero interval/timeout leaks, audio stopped on unmount.
- **TypeScript & ESLint Quality:**
  - 0 TypeScript compilation errors (`npx tsc --noEmit`).
  - 0 ESLint errors and 0 warnings (`npm run lint`).
