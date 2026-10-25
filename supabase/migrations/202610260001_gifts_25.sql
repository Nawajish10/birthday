-- 25 Distinct Birthday Gifts & Visitor Reveal State Migration
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

alter table public.birthday_gifts enable row level security;
alter table public.gift_reveals enable row level security;

create policy admin_manage_birthday_gifts on public.birthday_gifts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy admin_manage_gift_reveals on public.gift_reveals for all to authenticated using (public.is_admin()) with check (public.is_admin());

create trigger birthday_gifts_touch before update on public.birthday_gifts for each row execute function public.touch_updated_at();

-- Seed 25 distinct placeholder gifts for creator customization
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
