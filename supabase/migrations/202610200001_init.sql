-- Meerah Birthday Experience — initial Supabase schema
-- Run this entire file in Supabase SQL Editor. All media buckets are PRIVATE.
create extension if not exists pgcrypto with schema extensions;

create type public.access_scope as enum ('birthday','eternalus');

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default 'meera-birthday',
  recipient_name text not null default 'Meerah',
  nickname text not null default 'baba',
  birthday_at date,
  theme jsonb not null default '{"pink":"#e9b9bc","emerald":"#376e58","beige":"#fbf6ec","brown":"#6e4b3b","red":"#a64245","yellow":"#edc96f","orange":"#d88651"}'::jsonb,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public,auth
as $$ select exists(select 1 from public.admin_users where user_id=auth.uid()) $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.birthday_cards (
  id uuid primary key default gen_random_uuid(), experience_id uuid references public.experiences(id) on delete cascade,
  title text not null, body_en text not null default '', body_ur text not null default '',
  sort_order integer not null default 0, is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profile_posts (
  id uuid primary key default gen_random_uuid(), experience_id uuid references public.experiences(id) on delete cascade,
  media_path text not null, media_kind text not null default 'image' check (media_kind in ('image','video')),
  caption text not null default '', alt_text text not null default '', sort_order integer not null default 0,
  is_published boolean not null default false, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.eternalus_assets (
  id uuid primary key default gen_random_uuid(), media_path text not null, caption text not null default '', alt_text text not null default '',
  sort_order integer not null default 0, is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.story_items (
  id uuid primary key default gen_random_uuid(), experience_id uuid references public.experiences(id) on delete cascade,
  media_path text not null, media_kind text not null default 'image' check (media_kind in ('image','video')),
  caption text not null default '', alt_text text not null default '', sort_order integer not null default 0,
  is_published boolean not null default false, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.games (
  id uuid primary key default gen_random_uuid(), experience_id uuid references public.experiences(id) on delete cascade,
  title text not null, instructions text not null default '', reward_text text not null default '',
  sort_order integer not null default 0, is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.noah_knowledge (
  id uuid primary key default gen_random_uuid(), topic text not null, approved_text text not null,
  is_enabled boolean not null default true, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.creator_messages (
  id uuid primary key default gen_random_uuid(), visitor_id uuid not null, sender text not null check (sender in ('recipient','creator')),
  body text not null check (char_length(body) between 1 and 2000), created_at timestamptz not null default now(), read_at timestamptz
);
create table public.games_progress (
  id uuid primary key default gen_random_uuid(), visitor_id uuid not null, game_id uuid references public.games(id) on delete cascade,
  reward_unlocked boolean not null default false, completed_at timestamptz, unique(visitor_id,game_id)
);
create table public.access_secrets (
  scope public.access_scope primary key, method text not null check(method in ('passcode','recovery_code')),
  secret_hash text not null, updated_at timestamptz not null default now()
);
create table public.access_attempts (
  bucket_key text not null, scope public.access_scope not null, attempts integer not null default 0,
  window_started_at timestamptz not null default now(), locked_until timestamptz,
  primary key(bucket_key,scope)
);
create table public.audit_events (
  id bigint generated always as identity primary key, actor uuid, event_type text not null,
  outcome text not null, detail jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['experiences','birthday_cards','profile_posts','eternalus_assets','story_items','games','noah_knowledge'] loop execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()',t,t); end loop; end $$;

-- Atomic rate-limited verification. Only a boolean/method is returned, never the stored hash.
create or replace function public.verify_access_code(p_scope public.access_scope,p_code text,p_ip text)
returns jsonb language plpgsql security definer set search_path=public,extensions
as $$
declare v_key text; v_row public.access_attempts%rowtype; v_secret public.access_secrets%rowtype; v_ok boolean:=false;
begin
  if p_code is null or length(p_code)>128 then return jsonb_build_object('ok',false); end if;
  v_key:=encode(digest(coalesce(p_ip,'unknown')||':'||coalesce(current_setting('app.access_salt',true),'birthday-experience-v1'), 'sha256'),'hex');
  insert into public.access_attempts(bucket_key,scope) values(v_key,p_scope) on conflict do nothing;
  select * into v_row from public.access_attempts where bucket_key=v_key and scope=p_scope for update;
  if v_row.locked_until is not null and v_row.locked_until>now() then return jsonb_build_object('ok',false); end if;
  if v_row.window_started_at < now()-interval '15 minutes' then update public.access_attempts set attempts=0,window_started_at=now(),locked_until=null where bucket_key=v_key and scope=p_scope; end if;
  select * into v_secret from public.access_secrets where scope=p_scope;
  if found then v_ok:=extensions.crypt(p_code,v_secret.secret_hash)=v_secret.secret_hash; end if;
  if v_ok then
    delete from public.access_attempts where bucket_key=v_key and scope=p_scope;
    insert into public.audit_events(event_type,outcome,detail) values('access_check','success',jsonb_build_object('scope',p_scope));
    return jsonb_build_object('ok',true,'method',v_secret.method);
  end if;
  update public.access_attempts set attempts=attempts+1,locked_until=case when attempts+1>=6 then now()+interval '15 minutes' else null end where bucket_key=v_key and scope=p_scope;
  insert into public.audit_events(event_type,outcome,detail) values('access_check','failure',jsonb_build_object('scope',p_scope));
  return jsonb_build_object('ok',false);
end $$;
revoke all on function public.verify_access_code(public.access_scope,text,text) from public;
grant execute on function public.verify_access_code(public.access_scope,text,text) to anon,authenticated;

create or replace function public.admin_set_access_code(p_scope public.access_scope,p_code text)
returns void language plpgsql security definer set search_path=public,extensions
as $$ begin
 if auth.role()<>'service_role' then raise exception 'not authorized'; end if;
 if p_code is null or length(p_code)<8 or length(p_code)>128 then raise exception 'code must be 8-128 characters'; end if;
 insert into public.access_secrets(scope,method,secret_hash) values(p_scope,case when p_scope='birthday' then 'passcode' else 'recovery_code' end,extensions.crypt(p_code,extensions.gen_salt('bf',12)))
 on conflict(scope) do update set method=excluded.method,secret_hash=excluded.secret_hash,updated_at=now();
 insert into public.audit_events(event_type,outcome,detail) values('access_code_rotated','success',jsonb_build_object('scope',p_scope));
end $$;
revoke all on function public.admin_set_access_code(public.access_scope,text) from public;
grant execute on function public.admin_set_access_code(public.access_scope,text) to service_role;

-- RLS: deny public reads/writes. Admin editor uses authenticated identity; trusted server routes use server-only service key.
do $$ declare t text; begin
 foreach t in array array['experiences','admin_users','birthday_cards','profile_posts','eternalus_assets','story_items','games','noah_knowledge','creator_messages','games_progress','access_secrets','access_attempts','audit_events'] loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
create policy admin_manage_experiences on public.experiences for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_read_admin_users on public.admin_users for select to authenticated using(user_id=auth.uid());
create policy admin_manage_cards on public.birthday_cards for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_posts on public.profile_posts for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_eternalus_assets on public.eternalus_assets for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_stories on public.story_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_games on public.games for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_noah_knowledge on public.noah_knowledge for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_creator_messages on public.creator_messages for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_progress on public.games_progress for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_manage_secrets on public.access_secrets for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy admin_read_attempts on public.access_attempts for select to authenticated using(public.is_admin());
create policy admin_read_audit on public.audit_events for select to authenticated using(public.is_admin());

-- Private buckets. Birthday assets are delivered through short-lived signed URLs after the app session check.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('birthday-public','birthday-public',false,52428800,array['image/jpeg','image/png','image/webp','image/avif','video/mp4','audio/mpeg','audio/mp4','audio/wav'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('eternalus-private','eternalus-private',false,52428800,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy admin_storage_read on storage.objects for select to authenticated using(bucket_id in ('birthday-public','eternalus-private') and public.is_admin());
create policy admin_storage_insert on storage.objects for insert to authenticated with check(bucket_id in ('birthday-public','eternalus-private') and public.is_admin());
create policy admin_storage_update on storage.objects for update to authenticated using(bucket_id in ('birthday-public','eternalus-private') and public.is_admin()) with check(bucket_id in ('birthday-public','eternalus-private') and public.is_admin());
create policy admin_storage_delete on storage.objects for delete to authenticated using(bucket_id in ('birthday-public','eternalus-private') and public.is_admin());

-- Seed editable demo content. Replace before publishing.
insert into public.experiences(slug,recipient_name,nickname,status) values('meera-birthday','Meerah','baba','draft') on conflict(slug) do nothing;
insert into public.birthday_cards(title,body_en,body_ur,sort_order,is_published) values
('A note for you','Your smile brightens every day.','تمہاری مسکراہٹ ہر دن کو روشن کر دیتی ہے۔',1,true),
('For my baba','May your year be full of soft mornings, laughter, and little surprises.','تمہارا سال خوشیوں، ہنسی اور خوبصورت لمحوں سے بھرا ہو۔',2,true),
('A year that feels like you','May this new year bring you laughter, calm mornings, and all the little things that make you happiest.','یہ نیا سال تمہارے لیے ہنسی، پُرسکون صبحیں اور وہ تمام چھوٹی خوشیاں لے کر آئے جو تمہیں مسکرانے پر مجبور کرتی ہیں۔',3,true),
('Little things, big joy','I hope your days are filled with favorite songs, warm conversations, sweet surprises, and people who make you feel loved.','تمہارے دن پسندیدہ گانوں، پیاری باتوں، خوبصورت سرپرائزز اور اُن لوگوں سے بھرے رہیں جو تمہیں محبت کا احساس دلاتے ہیں۔',4,true),
('Always celebrated','Today is yours, but you deserve to feel celebrated in every season. I am so glad the world has you in it.','آج کا دن تمہارے نام ہے، مگر تم ہر موسم میں خوشیوں اور محبت کے حق دار ہو۔ مجھے خوشی ہے کہ تم اس دنیا میں ہو۔',5,true)
on conflict do nothing;
insert into public.games(title,instructions,reward_text,sort_order,is_published) values('Find the birthday star','Tap a square to uncover a birthday surprise.','Ordinary days feel golden because you are in them. Happy birthday, baba.',1,true);
insert into public.noah_knowledge(topic,approved_text,is_enabled) values('site navigation','The birthday book is on Home. The photo grid and video reels are under Profile. Older preloaded photos and videos are under Memories. Gift surprises are under Gifts. Eternalus is a separate private area.',true);

-- One-time setup commands (run manually after creating your Supabase Auth user):
-- 1) insert into public.admin_users(user_id,role) select id,'owner' from auth.users where email='YOUR_ADMIN_EMAIL';
-- 2) insert into public.access_secrets(scope,method,secret_hash) values
--    ('birthday','passcode',extensions.crypt('YOUR_BIRTHDAY_CODE',extensions.gen_salt('bf',12))),
--    ('eternalus','recovery_code',extensions.crypt('YOUR_SEPARATE_PRIVATE_CODE',extensions.gen_salt('bf',12)))
--    on conflict(scope) do update set method=excluded.method,secret_hash=excluded.secret_hash,updated_at=now();
-- 3) Upload approved image/video/audio objects to the matching private bucket, then add their object paths in profile_posts/story_items.
