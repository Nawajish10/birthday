-- Migration: Eternal Us Individual Verified Accounts & Multi-User Authorization

create table if not exists public.eternalus_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  person text not null check (person in ('meerah', 'creator')),
  display_name text not null,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.eternalus_members enable row level security;

-- Function to check if the current auth context is an approved Eternal Us member
create or replace function public.is_eternalus_member() returns boolean
language sql stable security definer set search_path=public,auth
as $$
  select exists(
    select 1 from public.eternalus_members where user_id = auth.uid()
  ) or exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_eternalus_member() from public;
grant execute on function public.is_eternalus_member() to authenticated;

-- Function to get the person identity of current user
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

-- RLS policies on eternalus_members
drop policy if exists members_read_own on public.eternalus_members;
create policy members_read_own on public.eternalus_members for select to authenticated
using (user_id = auth.uid() or public.is_admin());

-- Update eternalus_assets RLS to allow reading by any verified member
drop policy if exists admin_manage_eternalus_assets on public.eternalus_assets;
create policy member_read_eternalus_assets on public.eternalus_assets for select to authenticated
using (public.is_eternalus_member() and is_published = true);

create policy admin_manage_eternalus_assets on public.eternalus_assets for all to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Storage policies for eternalus-private
drop policy if exists member_storage_read_eternalus on storage.objects;
create policy member_storage_read_eternalus on storage.objects for select to authenticated
using (bucket_id = 'eternalus-private' and public.is_eternalus_member());
