# Meerah Birthday Experience

A mobile-first birthday site built with Next.js, TypeScript, Supabase Auth/Postgres/Storage, and an optional Noah AI guide.

## MVP included

- Special-date passcode gate with server-side bcrypt verification, 12-hour signed session, and database-backed attempt limiting.
- Birthday home with English/Urdu cards, a profile gallery, preloaded stories, camera capture, chat with the creator or Noah, and a configurable gift reveal.
- Recipient camera captures remain in the browser until “Add to profile” is selected. That explicit action uploads the image and publishes it in the profile.
- Supabase Auth-protected creator studio for bilingual cards, profile posts, stories, games, Noah’s approved knowledge, recipient messages, private gallery assets, and separate code rotation.
- Two private Storage buckets: `birthday-public` for ordinary birthday media and `eternalus-private` for couple photos. Both buckets are private despite the first bucket's name.
- Eternalus has a distinct recovery code and is not unlocked by the birthday code. Its images are streamed through an Eternalus-session check with `private, no-store` headers.
- Noah uses only enabled creator-approved knowledge and site navigation. The API requests `store:false`; Noah does not receive camera or Eternalus content.

## Birthday book content

The protected home screen uses a data-driven storybook assembled from creator-published content: an opening note, all published English/Urdu birthday cards, a photo gallery (or labelled placeholder), an approved birthday video preview (or labelled placeholder), a letter, a songbook link, and a closing page. The counter and progress dots use the actual page count. Arrow controls, keyboard left/right navigation, and horizontal touch swipes turn pages; reduced-motion preferences shorten the animation. Video playback requires an explicit user action and uses inline metadata controls.

Add or edit birthday card text and publish it in the creator studio. Add private-bucket birthday photos/reels and Memories videos in the creator media sections; these appear through the existing authenticated server content endpoint. Do not put private personal media in `public/`. The book's supported page content shape is defined in `src/components/Experience.tsx` as `BookPage`; it can be expanded to add standalone content pages.

## Requirements

- Node.js 20.9 or newer
- A Supabase project
- An optional OpenAI API key for Noah

## Supabase setup

1. Create a Supabase project and open its SQL Editor.
2. Run [`supabase/migrations/202610200001_init.sql`](supabase/migrations/202610200001_init.sql) once. It creates the schema, RLS policies, access-code RPCs, audit/rate-limit tables, and private Storage buckets.
3. In Supabase Authentication, create the creator's email/password user.
4. In the SQL Editor, add the creator account as an owner (replace the email):

```sql
insert into public.admin_users(user_id, role)
select id, 'owner'
from auth.users
where email = 'YOUR_ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

5. Start the app and sign in at `/admin`. Use **Access & codes** to set the birthday passcode and a different Eternalus recovery code. Codes must be 8–128 characters; the database stores bcrypt hashes and never returns plaintext.

If you need to set the initial codes directly in SQL instead, replace both values below and run this after the migration:

```sql
insert into public.access_secrets(scope, method, secret_hash) values
  ('birthday', 'passcode', extensions.crypt('REPLACE_WITH_BIRTHDAY_CODE', extensions.gen_salt('bf', 12))),
  ('eternalus', 'recovery_code', extensions.crypt('REPLACE_WITH_DIFFERENT_PRIVATE_CODE', extensions.gen_salt('bf', 12)))
on conflict (scope) do update
set method = excluded.method,
    secret_hash = excluded.secret_hash,
    updated_at = now();
```

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase project settings. The service-role key must remain server-only and must never use a `NEXT_PUBLIC_` prefix.
3. Set `SESSION_SECRET` to a random secret of at least 32 characters. Set `OPENAI_API_KEY` to enable Noah; `OPENAI_MODEL` is optional.
4. Install dependencies and start the development server:

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. Admin is at `http://localhost:3000/admin`.

## Creator content workflow

- Sign in at `/admin` with the Supabase Auth account added to `admin_users`.
- Add birthday cards, profile posts, story images/videos, game copy, and Noah knowledge. **Published** content appears to the recipient; drafts do not.
- Uploads are written to the private bucket from the browser using the authenticated admin session. Eternalus accepts images only.
- Add Eternalus assets in the Eternalus gallery tab. They remain unavailable until the recipient enters its separate recovery code.
- The Creator inbox lets the recipient and creator exchange stored text messages. Messages are retained in `creator_messages` until an admin removes them or the database is otherwise managed.

## Database and media

The migration creates `experiences`, `admin_users`, `birthday_cards`, `profile_posts`, `story_items`, `eternalus_assets`, `games`, `games_progress`, `noah_knowledge`, `creator_messages`, `access_secrets`, `access_attempts`, and `audit_events`. RLS is enabled. Browser table and Storage access is restricted to approved admin accounts; recipient content access goes through server routes that check signed cookies before using the server-only service key.

Supabase database backups do not include Storage objects. Set up a separate backup and restore process for birthday and Eternalus media before production. Remove drafts and test assets before sharing the site.

## Important boundaries before launch

- **Face recognition is not implemented.** Eternalus currently uses its separate recovery code. Do not present this as face matching or biometric identity verification. A face provider, liveness/PAD policy, consent copy, and failure/recovery plan are still required before adding that feature.
- The birthday passcode is a personal access gate, not high-assurance authentication. The six-attempt / 15-minute limiter is per derived client IP key; deployment proxy/IP behavior should be confirmed before launch.
- The public birthday surfaces use private objects and short-lived signed URLs. Already issued birthday media URLs remain usable until their expiry. Eternalus media is delivered through an authorized no-store server route.
- Camera permission is requested only when the recipient presses **Open camera**. A captured photo remains local until **Add to profile** explicitly uploads it; that action makes it visible in the birthday profile.
- Noah requires a valid OpenAI key and model access. Without a key, a setup response appears. Conversation messages are held in browser state; they are not persisted. Creator chat messages are persisted.
- Real photos, video, the birthday soundtrack, final personal copy, and any AI-generated child video are content assets that still need to be provided/approved and uploaded. The current home page shows a soundtrack placeholder until an audio control is connected to supplied media.
- Configure production HTTPS, Supabase Auth redirect URLs, deployment environment variables, content retention/deletion, and media backups before publishing.

## Owner-provided items still needed

Supabase project credentials, creator Auth account/email, separate birthday and Eternalus codes, final English/Urdu birthday text, approved photos/videos/audio, Noah's API key/provider preference, and a decision/provider for real face verification.
