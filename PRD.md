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
- General-purpose relationship management, chat, calendar, streaks, or daily journal.
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

`Passcode → Birthday home/book → Profile/gallery ↔ Stories/camera ↔ Chat (creator or Noah) → Gift game(s) → Closing message → Eternalus entry card → Face verification → Eternalus gallery`

The visitor may revisit birthday chapters after unlocking the birthday experience. Eternalus stays independently locked until its own verification succeeds. A birthday passcode must not imply that Eternalus is unlocked.

### Pages/sections

1. **Passcode page:** greeting context, passcode input, submit, retry feedback, accessible error state.
2. **Birthday home / keepsake book:** Meerah’s name, realistic unfolding-card/book interaction, birthday greeting, creator messages in English and Urdu, song controls, and navigation to the four main areas.
3. **Profile/gallery:** an Instagram-inspired profile and selectable photo grid of creator-preloaded birthday images of Meerah; tapping a tile opens a media viewer with caption and navigation.
4. **Stories and camera:** a Snapchat/WhatsApp-status-inspired full-screen story viewer for preloaded content, plus user-initiated camera capture with clear permission and save behavior.
5. **Chat:** separate human chat thread with the creator and a clearly labeled Noah AI companion. Noah is grounded in creator-approved content and site navigation only.
6. **Gift games:** at least one small, optional puzzle/reveal that unlocks a birthday note or gift; skippable and non-blocking.
7. **Closing message:** final birthday note and end-of-story media.
8. **Eternalus entry:** clear explanation that this is a separate private couple gallery; open action starts face verification.
9. **Face verification:** camera permission rationale, live capture flow, result, retry, camera-unavailable state, fallback/recovery.
10. **Eternalus gallery:** protected couple photos, minimal metadata, exit/lock action.

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

#### F. Chat with creator and Noah

- Separate conversation entry points for the creator and Noah (AI companion).
- Noah is clearly identified as AI and limited to creator-approved birthday copy/captions and navigation help.
- Noah cannot read camera captures, Eternalus images, biometric data, or unapproved private chats.
- Include a fallback if the AI endpoint is unavailable, plus a way to clear the current conversation.
- Define message retention and provider data handling before launch; do not store chat by default unless a product need is confirmed.

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

### FR-5 Chat and Noah

- Recipient can distinguish the creator conversation from Noah’s AI conversation.
- Noah answers only from approved knowledge and does not claim to be the creator or a human.
- Noah cannot retrieve Eternalus media, raw captures, or private biometric information.
- If no approved source supports an answer, Noah says it does not know or offers navigation help.

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
- Keep secrets and provider keys server-side.
- Validate all requests, rate-limit passcode and verification endpoints, and set restrictive security headers and content policies.
- Private media stored in a non-public bucket/container and served through short-lived authorization URLs or a protected proxy.
- Prevent caching of Eternalus media by shared/public caches; define suitable private cache headers.
- Avoid collecting IP/device analytics unless necessary; document any operational logs and expiry.

### Privacy

- Data minimization: collect only content necessary for the birthday experience.
- Face data is sensitive biometric information. Establish consent, retention, deletion, and processing location before implementing matching.
- The reference face image must be handled as sensitive content, not placed in the public site bundle.
- No AI provider receives private photos, selfies, or biometric data in MVP.

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

**Document note:** This PRD reflects the user’s agreed product direction. The workspace had no application files when this document was created; technical architecture above is a proposed target, not verified existing implementation.
