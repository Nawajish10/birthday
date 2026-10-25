-- Shared birthday music library and recipient-created playlists.
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

alter table public.music_tracks enable row level security;
alter table public.music_playlists enable row level security;
alter table public.music_playlist_tracks enable row level security;
drop policy if exists admin_manage_music_tracks on public.music_tracks;
create policy admin_manage_music_tracks on public.music_tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_manage_music_playlists on public.music_playlists;
create policy admin_manage_music_playlists on public.music_playlists for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists admin_manage_music_playlist_tracks on public.music_playlist_tracks;
create policy admin_manage_music_playlist_tracks on public.music_playlist_tracks for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop trigger if exists music_tracks_touch on public.music_tracks;
create trigger music_tracks_touch before update on public.music_tracks for each row execute function public.touch_updated_at();
drop trigger if exists music_playlists_touch on public.music_playlists;
create trigger music_playlists_touch before update on public.music_playlists for each row execute function public.touch_updated_at();

update storage.buckets set allowed_mime_types=array[
  'image/jpeg','image/png','image/webp','image/avif','video/mp4',
  'audio/mpeg','audio/mp4','audio/wav','audio/aac','audio/ogg','audio/webm'
] where id='birthday-public';
