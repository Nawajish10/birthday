-- Migration: 202610290003_music_system_full.sql
-- Description: Additive music system schema - extended tracks, likes, user playlists, playback state, history, lyrics, audio storage bucket

-- 1. Extend existing public.music_tracks table
ALTER TABLE public.music_tracks
  ADD COLUMN IF NOT EXISTS album text,
  ADD COLUMN IF NOT EXISTS artwork_path text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'imported' CHECK (source_type IN ('imported','provider')),
  ADD COLUMN IF NOT EXISTS provider_ref text,
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available','unavailable','processing','error'));

CREATE INDEX IF NOT EXISTS idx_music_tracks_published ON public.music_tracks(is_published, sort_order);

-- 2. New table: music_likes (per-user track likes)
CREATE TABLE IF NOT EXISTS public.music_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_music_likes_user_id ON public.music_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_track_id ON public.music_likes(track_id);

-- 3. New table: user_playlists (user-created playlists)
CREATE TABLE IF NOT EXISTS public.user_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description text,
  artwork_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON public.user_playlists(user_id);

-- 4. New table: user_playlist_tracks (tracks in user playlists)
CREATE TABLE IF NOT EXISTS public.user_playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.user_playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_user_playlist_tracks_playlist ON public.user_playlist_tracks(playlist_id, sort_order);

-- 5. New table: music_playback_state (per-user persistent playback)
CREATE TABLE IF NOT EXISTS public.music_playback_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid REFERENCES public.music_tracks(id) ON DELETE SET NULL,
  position_seconds numeric(10,3) NOT NULL DEFAULT 0,
  queue_track_ids uuid[] NOT NULL DEFAULT '{}',
  queue_index integer NOT NULL DEFAULT 0,
  is_shuffle boolean NOT NULL DEFAULT false,
  repeat_mode text NOT NULL DEFAULT 'off' CHECK (repeat_mode IN ('off','one','all')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. New table: music_listening_history (meaningful play events)
CREATE TABLE IF NOT EXISTS public.music_listening_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  played_at timestamptz NOT NULL DEFAULT now(),
  completed boolean NOT NULL DEFAULT false,
  progress_seconds numeric(10,3)
);

CREATE INDEX IF NOT EXISTS idx_history_user_played ON public.music_listening_history(user_id, played_at DESC);

-- 7. New table: music_lyrics (optional per-track lyrics)
CREATE TABLE IF NOT EXISTS public.music_lyrics (
  track_id uuid PRIMARY KEY REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  plain_text text,
  timed_json jsonb,
  language text NOT NULL DEFAULT 'en',
  source_attribution text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.music_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_playback_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_lyrics ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- music_likes: users can manage only their own likes
DROP POLICY IF EXISTS user_manage_music_likes ON public.music_likes;
CREATE POLICY user_manage_music_likes ON public.music_likes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_playlists: users can manage only their own playlists
DROP POLICY IF EXISTS user_manage_user_playlists ON public.user_playlists;
CREATE POLICY user_manage_user_playlists ON public.user_playlists FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- user_playlist_tracks: user can manage tracks only in their own playlists (join check)
DROP POLICY IF EXISTS user_manage_user_playlist_tracks ON public.user_playlist_tracks;
CREATE POLICY user_manage_user_playlist_tracks ON public.user_playlist_tracks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_playlists
      WHERE user_playlists.id = user_playlist_tracks.playlist_id
      AND user_playlists.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_playlists
      WHERE user_playlists.id = user_playlist_tracks.playlist_id
      AND user_playlists.user_id = auth.uid()
    )
  );

-- music_playback_state: user can manage only their own row
DROP POLICY IF EXISTS user_manage_playback_state ON public.music_playback_state;
CREATE POLICY user_manage_playback_state ON public.music_playback_state FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- music_listening_history: user can only read/insert their own rows
DROP POLICY IF EXISTS user_read_listening_history ON public.music_listening_history;
CREATE POLICY user_read_listening_history ON public.music_listening_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_insert_listening_history ON public.music_listening_history;
CREATE POLICY user_insert_listening_history ON public.music_listening_history FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- music_lyrics: authenticated users can read; only admins can write
DROP POLICY IF EXISTS auth_read_music_lyrics ON public.music_lyrics;
CREATE POLICY auth_read_music_lyrics ON public.music_lyrics FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS admin_manage_music_lyrics ON public.music_lyrics;
CREATE POLICY admin_manage_music_lyrics ON public.music_lyrics FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Read policies for existing music tables (allow authenticated users to select published items)
DROP POLICY IF EXISTS auth_read_music_tracks ON public.music_tracks;
CREATE POLICY auth_read_music_tracks ON public.music_tracks FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS auth_read_music_playlists ON public.music_playlists;
CREATE POLICY auth_read_music_playlists ON public.music_playlists FOR SELECT TO authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS auth_read_music_playlist_tracks ON public.music_playlist_tracks;
CREATE POLICY auth_read_music_playlist_tracks ON public.music_playlist_tracks FOR SELECT TO authenticated
  USING (true);

-- 10. Private storage bucket for audio
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES (
  'birthday-audio',
  'birthday-audio',
  false,
  ARRAY['audio/mpeg','audio/mp4','audio/wav','audio/aac','audio/ogg','audio/webm','audio/flac']
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS admin_audio_bucket_all ON storage.objects;
CREATE POLICY admin_audio_bucket_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'birthday-audio' AND public.is_admin())
  WITH CHECK (bucket_id = 'birthday-audio' AND public.is_admin());

-- 11. Triggers for updated_at
DROP TRIGGER IF EXISTS user_playlists_touch ON public.user_playlists;
CREATE TRIGGER user_playlists_touch BEFORE UPDATE ON public.user_playlists FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS music_playback_state_touch ON public.music_playback_state;
CREATE TRIGGER music_playback_state_touch BEFORE UPDATE ON public.music_playback_state FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS music_lyrics_touch ON public.music_lyrics;
CREATE TRIGGER music_lyrics_touch BEFORE UPDATE ON public.music_lyrics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
