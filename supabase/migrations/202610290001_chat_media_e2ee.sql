-- Migration: Chat Media Attachments & End-to-End Encryption (E2EE)
-- Supports encrypted 1-to-1 private messaging between Meerah and Creator

-- 1. Extend creator_messages table with media metadata and E2EE fields
alter table public.creator_messages
  add column if not exists media_url text,
  add column if not exists media_type text check (media_type is null or media_type in ('image', 'video', 'voice', 'gif')),
  add column if not exists media_name text,
  add column if not exists media_size integer,
  add column if not exists iv text,
  add column if not exists is_encrypted boolean not null default false;

-- Allow body to be nullable when media attachments are sent without caption,
-- and expand length limit for base64 encoded ciphertexts
alter table public.creator_messages alter column body drop not null;

do $$
begin
  alter table public.creator_messages drop constraint if exists creator_messages_body_check;
exception when others then
  null;
end $$;

alter table public.creator_messages
  add constraint creator_messages_body_check check (
    body is null or char_length(body) <= 20000
  );

-- 2. Performance indexes for message queries and cursor-based pagination
create index if not exists idx_creator_messages_visitor_created
  on public.creator_messages (visitor_id, created_at desc);

create index if not exists idx_creator_messages_created
  on public.creator_messages (created_at desc);

-- 3. Dedicated private storage bucket for chat attachments (both encrypted blobs & standard media)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  52428800, -- 50 MB limit
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac', 'audio/m4a',
    'application/octet-stream' -- Required for client-side encrypted binary payloads
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 4. RLS policies for storage objects in chat-media bucket
drop policy if exists admin_storage_chat_media_read on storage.objects;
create policy admin_storage_chat_media_read on storage.objects for select to authenticated
using (bucket_id = 'chat-media' and public.is_admin());

drop policy if exists admin_storage_chat_media_insert on storage.objects;
create policy admin_storage_chat_media_insert on storage.objects for insert to authenticated
with check (bucket_id = 'chat-media' and public.is_admin());

drop policy if exists admin_storage_chat_media_delete on storage.objects;
create policy admin_storage_chat_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'chat-media' and public.is_admin());
