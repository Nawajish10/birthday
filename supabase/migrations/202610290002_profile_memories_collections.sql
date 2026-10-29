-- Migration: 202610290002_profile_memories_collections.sql
-- Description: Schema extension for Photo Assets, Highlights, Albums, Stories, and Profile Persistence

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

-- Indexes for performance
create index if not exists idx_photo_assets_created_at on public.photo_assets (created_at desc);
create index if not exists idx_highlights_created_at on public.highlights (created_at desc);
create index if not exists idx_albums_created_at on public.albums (created_at desc);
create index if not exists idx_stories_created_at on public.stories (created_at desc);

