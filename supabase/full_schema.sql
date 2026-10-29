-- ============================================================================
-- MEERAH BIRTHDAY EXPERIENCE — COMPLETE UNIFIED MASTER SCHEMA
-- Target Database: vivjduxkbyqpvnzykwgj
-- ============================================================================

-- 1. Extensions
create extension if not exists pgcrypto with schema extensions;

-- 2. Custom Types & Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'access_scope') then
    create type public.access_scope as enum ('birthday', 'eternalus');
  end if;
end $$;

-- 3. Utility Trigger Function
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 4. Admin Users & Authorization Function
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, auth
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid())
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 5. Core Experience Configuration
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'meera-birthday',
  recipient_name text not null default 'Meerah',
  nickname text not null default 'baba',
  birthday_at date,
  theme jsonb not null default '{"pink":"#e9b9bc","emerald":"#376e58","beige":"#fbf6ec","brown":"#6e4b3b","red":"#a64245","yellow":"#edc96f","orange":"#d88651"}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Access Secrets, Rate Limiting & Audit Logging
create table if not exists public.access_secrets (
  scope public.access_scope primary key,
  method text not null check (method in ('passcode','recovery_code')),
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.access_attempts (
  bucket_key text not null,
  scope public.access_scope not null,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  primary key (bucket_key, scope)
);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor uuid,
  event_type text not null,
  outcome text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.verify_access_code(p_scope public.access_scope, p_code text, p_ip text)
returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare
  v_key text;
  v_row public.access_attempts%rowtype;
  v_secret public.access_secrets%rowtype;
  v_ok boolean := false;
begin
  if p_code is null or length(p_code) > 128 then
    return jsonb_build_object('ok', false);
  end if;
  v_key := encode(digest(coalesce(p_ip, 'unknown') || ':' || coalesce(current_setting('app.access_salt', true), 'birthday-experience-v1'), 'sha256'), 'hex');
  insert into public.access_attempts(bucket_key, scope) values(v_key, p_scope) on conflict do nothing;
  select * into v_row from public.access_attempts where bucket_key = v_key and scope = p_scope for update;
  if v_row.locked_until is not null and v_row.locked_until > now() then
    return jsonb_build_object('ok', false);
  end if;
  if v_row.window_started_at < now() - interval '15 minutes' then
    update public.access_attempts set attempts = 0, window_started_at = now(), locked_until = null where bucket_key = v_key and scope = p_scope;
  end if;
  select * into v_secret from public.access_secrets where scope = p_scope;
  if found then
    v_ok := extensions.crypt(p_code, v_secret.secret_hash) = v_secret.secret_hash;
  end if;
  if v_ok then
    delete from public.access_attempts where bucket_key = v_key and scope = p_scope;
    insert into public.audit_events(event_type, outcome, detail) values('access_check', 'success', jsonb_build_object('scope', p_scope));
    return jsonb_build_object('ok', true, 'method', v_secret.method);
  end if;
  update public.access_attempts set attempts = attempts + 1, locked_until = case when attempts + 1 >= 6 then now() + interval '15 minutes' else null end where bucket_key = v_key and scope = p_scope;
  insert into public.audit_events(event_type, outcome, detail) values('access_check', 'failure', jsonb_build_object('scope', p_scope));
  return jsonb_build_object('ok', false);
end $$;
revoke all on function public.verify_access_code(public.access_scope, text, text) from public;
grant execute on function public.verify_access_code(public.access_scope, text, text) to anon, authenticated;

create or replace function public.admin_set_access_code(p_scope public.access_scope, p_code text)
returns void language plpgsql security definer set search_path=public,extensions
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized';
  end if;
  if p_code is null or length(p_code) < 8 or length(p_code) > 128 then
    raise exception 'code must be 8-128 characters';
  end if;
  insert into public.access_secrets(scope, method, secret_hash)
  values(p_scope, case when p_scope = 'birthday' then 'passcode' else 'recovery_code' end, extensions.crypt(p_code, extensions.gen_salt('bf', 12)))
  on conflict(scope) do update set method = excluded.method, secret_hash = excluded.secret_hash, updated_at = now();
  insert into public.audit_events(event_type, outcome, detail) values('access_code_rotated', 'success', jsonb_build_object('scope', p_scope));
end $$;
revoke all on function public.admin_set_access_code(public.access_scope, text) from public;
grant execute on function public.admin_set_access_code(public.access_scope, text) to service_role;

-- 7. Birthday Content (Cards, Profile Posts, Stories, Noah Knowledge)
create table if not exists public.birthday_cards (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references public.experiences(id) on delete cascade,
  title text not null,
  body_en text not null default '',
  body_ur text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_posts (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references public.experiences(id) on delete cascade,
  media_path text not null,
  media_kind text not null default 'image' check (media_kind in ('image','video')),
  caption text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.story_items (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references public.experiences(id) on delete cascade,
  media_path text not null,
  media_kind text not null default 'image' check (media_kind in ('image','video')),
  caption text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.noah_knowledge (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  approved_text text not null,
  is_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. Games & Progress
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid references public.experiences(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  reward_text text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games_progress (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  game_id uuid references public.games(id) on delete cascade,
  reward_unlocked boolean not null default false,
  completed_at timestamptz,
  unique (visitor_id, game_id)
);

-- 9. 25 Birthday Gifts & Reveals
create table if not exists public.birthday_gifts (
  id uuid primary key default gen_random_uuid(),
  slot_number integer not null unique check (slot_number between 1 and 25),
  title text not null check (char_length(title) between 1 and 120),
  hint text not null default '',
  reward_type text not null default 'note' check (reward_type in ('note', 'letter', 'photo', 'song', 'memory', 'activity')),
  reward_content text not null,
  media_path text,
  unlock_at timestamptz,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_reveals (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  gift_id uuid not null references public.birthday_gifts(id) on delete cascade,
  revealed_at timestamptz not null default now(),
  unique (visitor_id, gift_id)
);

-- 10. Creator Messages (1-to-1 Chat with Media Attachments & E2EE)
create table if not exists public.creator_messages (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  sender text not null check (sender in ('recipient', 'creator')),
  body text check (body is null or char_length(body) <= 20000),
  media_url text,
  media_type text check (media_type is null or media_type in ('image', 'video', 'voice', 'gif')),
  media_name text,
  media_size integer,
  iv text,
  is_encrypted boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_creator_messages_visitor_created
  on public.creator_messages (visitor_id, created_at desc);

create index if not exists idx_creator_messages_created
  on public.creator_messages (created_at desc);

-- 11. Music Tracks & Playlists
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  artist text not null default '',
  media_path text not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_by text not null default 'recipient' check (created_by in ('admin','recipient')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_playlist_tracks (
  playlist_id uuid not null references public.music_playlists(id) on delete cascade,
  track_id uuid not null references public.music_tracks(id) on delete cascade,
  sort_order integer not null default 0,
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id)
);

-- 12. Eternal Us Members & Assets
create table if not exists public.eternalus_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  person text not null check (person in ('meerah', 'creator')),
  display_name text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.eternalus_assets (
  id uuid primary key default gen_random_uuid(),
  media_path text not null,
  caption text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_eternalus_member() returns boolean
language sql stable security definer set search_path=public,auth
as $$
  select exists(select 1 from public.eternalus_members where user_id = auth.uid())
  or exists(select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_eternalus_member() from public;
grant execute on function public.is_eternalus_member() to authenticated;

create or replace function public.get_eternalus_person() returns text
language sql stable security definer set search_path=public,auth
as $$
  select coalesce(
    (select person from public.eternalus_members where user_id = auth.uid()),
    (select 'creator' from public.admin_users where user_id = auth.uid()),
    'anonymous'
  );
$$;
revoke all on function public.get_eternalus_person() from public;
grant execute on function public.get_eternalus_person() to authenticated;

-- 13. Photo Assets, User Profiles, Highlights, Albums & Stories
create table if not exists public.photo_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  media_kind text not null default 'image' check (media_kind in ('image', 'video')),
  effective_capture_date text,
  has_known_capture_date boolean not null default true,
  caption text not null default '',
  alt_text text not null default '',
  owner_visitor_id text,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Meerah',
  bio text not null default 'birthday girl · main character today',
  birth_date text not null default '2002-10-29',
  avatar_url text,
  avatar_path text,
  interests jsonb not null default '["Reading", "Poetry", "Music", "Photography"]'::jsonb,
  external_instagram_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_photo_id uuid references public.photo_assets(id) on delete set null,
  cover_photo_url text,
  photo_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_photo_id uuid references public.photo_assets(id) on delete set null,
  cover_photo_url text,
  photo_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  photo_ids jsonb not null default '[]'::jsonb,
  music_track_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_photo_assets_created_at on public.photo_assets (created_at desc);
create index if not exists idx_highlights_created_at on public.highlights (created_at desc);
create index if not exists idx_albums_created_at on public.albums (created_at desc);
create index if not exists idx_stories_created_at on public.stories (created_at desc);

-- 14. Trigger Attachments
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'experiences', 'birthday_cards', 'profile_posts', 'eternalus_assets',
    'story_items', 'games', 'noah_knowledge', 'birthday_gifts',
    'music_tracks', 'music_playlists', 'photo_assets', 'highlights', 'albums', 'stories'
  ] loop
    execute format('drop trigger if exists %I_touch on public.%I;', tbl, tbl);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at();', tbl, tbl);
  end loop;
end $$;

-- 15. Enable Row Level Security (RLS)
alter table public.experiences enable row level security;
alter table public.admin_users enable row level security;
alter table public.birthday_cards enable row level security;
alter table public.profile_posts enable row level security;
alter table public.eternalus_assets enable row level security;
alter table public.story_items enable row level security;
alter table public.games enable row level security;
alter table public.noah_knowledge enable row level security;
alter table public.creator_messages enable row level security;
alter table public.games_progress enable row level security;
alter table public.access_secrets enable row level security;
alter table public.access_attempts enable row level security;
alter table public.audit_events enable row level security;
alter table public.birthday_gifts enable row level security;
alter table public.gift_reveals enable row level security;
alter table public.eternalus_members enable row level security;
alter table public.music_tracks enable row level security;
alter table public.music_playlists enable row level security;
alter table public.music_playlist_tracks enable row level security;
alter table public.photo_assets enable row level security;
alter table public.user_profiles enable row level security;
alter table public.highlights enable row level security;
alter table public.albums enable row level security;
alter table public.stories enable row level security;

-- 16. Row Level Security Policies
-- Admin Full Management Policies (All server route handlers use service_role which bypasses RLS)
create policy admin_manage_experiences on public.experiences for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_read_admin_users on public.admin_users for select to authenticated using (user_id = auth.uid());
create policy admin_manage_cards on public.birthday_cards for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_posts on public.profile_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_stories on public.story_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_games on public.games for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_noah_knowledge on public.noah_knowledge for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_creator_messages on public.creator_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_progress on public.games_progress for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_secrets on public.access_secrets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_read_attempts on public.access_attempts for select to authenticated using (public.is_admin());
create policy admin_read_audit on public.audit_events for select to authenticated using (public.is_admin());
create policy admin_manage_birthday_gifts on public.birthday_gifts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_gift_reveals on public.gift_reveals for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_music_tracks on public.music_tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_music_playlists on public.music_playlists for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_music_playlist_tracks on public.music_playlist_tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_photo_assets on public.photo_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_user_profiles on public.user_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_highlights on public.highlights for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_albums on public.albums for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_stories_col on public.stories for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Eternal Us Multi-User Policies
create policy members_read_own on public.eternalus_members for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy member_read_eternalus_assets on public.eternalus_assets for select to authenticated using (public.is_eternalus_member() and is_published = true);
create policy admin_manage_eternalus_assets on public.eternalus_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 17. Storage Buckets Setup
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'birthday-public',
  'birthday-public',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/webm'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eternalus-private',
  'eternalus-private',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/m4a',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage Policies
drop policy if exists admin_storage_all on storage.objects;
create policy admin_storage_all on storage.objects for all to authenticated
using (bucket_id in ('birthday-public', 'eternalus-private', 'chat-media') and public.is_admin())
with check (bucket_id in ('birthday-public', 'eternalus-private', 'chat-media') and public.is_admin());

drop policy if exists member_storage_read_eternalus on storage.objects;
create policy member_storage_read_eternalus on storage.objects for select to authenticated
using (bucket_id = 'eternalus-private' and public.is_eternalus_member());

-- 18. Seed Initial Data
insert into public.experiences (slug, recipient_name, nickname, status)
values ('meera-birthday', 'Meerah', 'baba', 'draft')
on conflict (slug) do nothing;

insert into public.birthday_cards (title, body_en, body_ur, sort_order, is_published) values
('A note for you', 'Your smile brightens every day.', 'تمہاری مسکراہٹ ہر دن کو روشن کر دیتی ہے۔', 1, true),
('For my baba', 'May your year be full of soft mornings, laughter, and little surprises.', 'تمہارا سال خوشیوں، ہنسی اور خوبصورت لمحوں سے بھرا ہو۔', 2, true),
('A year that feels like you', 'May this new year bring you laughter, calm mornings, and all the little things that make you happiest.', 'یہ نیا سال تمہارے لیے ہنسی، پُرسکون صبحیں اور وہ تمام چھوٹی خوشیاں لے کر آئے جو تمہیں مسکرانے پر مجبور کرتی ہیں۔', 3, true),
('Little things, big joy', 'I hope your days are filled with favorite songs, warm conversations, sweet surprises, and people who make you feel loved.', 'تمہارے دن پسندیدہ گانوں، پیاری باتوں، خوبصورت سرپرائزز اور اُن لوگوں سے بھرے رہیں جو تمہیں محبت کا احساس دلاتے ہیں۔', 4, true),
('Always celebrated', 'Today is yours, but you deserve to feel celebrated in every season. I am so glad the world has you in it.', 'آج کا دن تمہارے نام ہے، مگر تم ہر موسم میں خوشیوں اور محبت کے حق دار ہو۔ مجھے خوشی ہے کہ تم اس دنیا میں ہو۔', 5, true)
on conflict do nothing;

insert into public.games (title, instructions, reward_text, sort_order, is_published)
values ('Find the birthday star', 'Tap a square to uncover a birthday surprise.', 'Ordinary days feel golden because you are in them. Happy birthday, baba.', 1, true)
on conflict do nothing;

insert into public.noah_knowledge (topic, approved_text, is_enabled)
values ('site navigation', 'The birthday book is on Home. The photo grid and video reels are under Profile. Older preloaded photos and videos are under Memories. Gift surprises are under Gifts. Eternalus is a separate private area.', true)
on conflict do nothing;

insert into public.user_profiles (display_name, bio, birth_date, interests)
values ('Meerah', 'birthday girl · main character today', '2002-10-29', '["Reading", "Poetry", "Music", "Photography"]'::jsonb)
on conflict do nothing;

insert into public.birthday_gifts (slot_number, title, hint, reward_type, reward_content) values
  (1, 'A Gentle Beginning', 'A little morning wish for today', 'note', 'May your day open softly with laughter, warmth, and peace. Happy birthday, Meerah!'),
  (2, 'Morning Sunshine', 'A reminder of your light', 'note', 'You bring warmth into ordinary days effortlessly.'),
  (3, 'Sweet Memories', 'A favorite moment revisited', 'memory', 'Remembering the day we spent laughing until our sides hurt.'),
  (4, 'The Little Things', 'Something small that means a lot', 'note', 'It is always the little conversations with you that stay the longest.'),
  (5, 'Birthday Melody', 'A tune waiting for your ears', 'song', 'A favorite shared song to play today.'),
  (6, 'Your Gentle Smile', 'A reason to smile right now', 'note', 'Your smile brightens any room in an instant.'),
  (7, 'Warm Cups & Soft Mornings', 'A cozy comfort wish', 'note', 'Wishing you slow, peaceful mornings with your favorite hot drink.'),
  (8, 'Adventures Ahead', 'Looking forward to new chapters', 'note', 'There are so many wonderful journeys still waiting for you.'),
  (9, 'A Note in Urdu', 'دل سے لکھی گئی ایک چھوٹی سی بات', 'note', 'تمہاری مسکراہٹ ہر دن کو روشن کر دیتی ہے۔ سالگرہ مبارک!'),
  (10, 'Golden Hour', 'A snapshot of beauty', 'photo', 'A golden-hour photograph picked especially for you.'),
  (11, 'Laughter Unlocked', 'An inside joke to make you grin', 'note', 'Here is to every silly inside joke only we understand.'),
  (12, 'Quiet Strength', 'Celebrating who you are', 'note', 'You handle the world with grace, patience, and kindness.'),
  (13, 'A Special Hug', 'Warmth across any distance', 'note', 'Sending you the biggest birthday hug today.'),
  (14, 'Favorite Treat', 'A little sweet surprise', 'activity', 'An official coupon for your favorite sweet dessert today!'),
  (15, 'Stars in the Night', 'Under the same sky', 'note', 'No matter where we are, the night sky connects our thoughts.'),
  (16, 'A Moment of Peace', 'Breathe and take it all in', 'note', 'Today belongs to you. Take a deep breath and let yourself be celebrated.'),
  (17, 'A Shared Memory', 'Looking back at how far we have come', 'memory', 'Every step of the journey has been better because of you.'),
  (18, 'The Sparkle in Your Eyes', 'A tiny observation', 'note', 'The way your eyes light up when you talk about things you love.'),
  (19, 'Kind Words Only', 'Affirmations for your year', 'note', 'May this year bring gentle surprises, genuine peace, and deep happiness.'),
  (20, 'Unconditional Love', 'Always here for you', 'letter', 'A personal note to remind you that you are deeply cherished today and always.'),
  (21, 'Little Flower', 'A blooming wish', 'note', 'Like a flower in spring, may your days bloom with grace and joy.'),
  (22, 'Late Night Conversations', 'Cherished quiet hours', 'note', 'Those late-night chats that make time stand completely still.'),
  (23, 'A Promise for the Year', 'Looking ahead together', 'note', 'A promise to always listen, support, and celebrate you.'),
  (24, 'The Eve of Joy', 'Almost at the crowning gift', 'note', 'You are so special to everyone around you. Thank you for being you.'),
  (25, 'The Birthday Star', 'The grand birthday reveal', 'letter', 'You are the heart of this entire little world. Happy Birthday, my dearest Meerah!')
on conflict (slot_number) do nothing;

-- 8. Seed Authoritative Access Secrets (Authoritative Passcode: 30102001)
insert into public.access_secrets (scope, method, secret_hash) values
  ('birthday', 'passcode', extensions.crypt('30102001', extensions.gen_salt('bf', 12))),
  ('eternalus', 'recovery_code', extensions.crypt('30102001', extensions.gen_salt('bf', 12)))
on conflict (scope) do update set secret_hash = excluded.secret_hash, updated_at = now();
