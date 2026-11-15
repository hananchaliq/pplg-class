-- Migrasi Awal Website Kenangan Kelas XII PPLG 1 — MAKN Ende
-- Mencakup Enum, Tabel, View Kapsul Waktu Aman, Kebijakan RLS, dan Bucket Storage

create extension if not exists "pgcrypto";

create type content_status as enum ('pending','approved','rejected');
create type gender_t as enum ('L','P');
create type teacher_group as enum ('kejuruan','agama','akademik');
create type moment_phase as enum ('X','XI','XII');

create table students (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  full_name text not null,
  nickname text,
  gender gender_t not null,
  is_active boolean not null default true,       -- false = pernah bersama kita
  show_photo boolean not null default true,
  photo_url text,
  bio text,
  tags text[] default '{}',
  links jsonb default '[]',                      -- [{label, href}]
  tone smallint check (tone between 1 and 5),
  rail_group text,                               -- 'L', 'P1', 'P2', 'moved'
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text not null,                           -- mapel atau jabatan
  grp teacher_group not null,
  is_homeroom boolean not null default false,
  photo_url text,
  message text,
  tone smallint check (tone between 1 and 5),
  sort_order int default 0,
  created_at timestamptz not null default now()
);

create table moments (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  taken_at date,
  category text,
  phase moment_phase,
  uploader_name text,
  featured boolean default false,                -- tampil di rak 3D
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table dreams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique references students(id) on delete cascade,
  dream text not null,
  reason text,
  paper_color text not null,                     -- tetap per siswa
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table dream_cheers (
  id uuid primary key default gen_random_uuid(),
  dream_id uuid references dreams(id) on delete cascade,
  author_name text,
  message text not null,
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table memory_entries (                    -- Buku Kenangan
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  author_name text,
  message text not null,
  decor_seed int default floor(random()*1000),   -- variasi hiasan halaman
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table time_capsules (
  id uuid primary key default gen_random_uuid(),
  author_name text,
  recipient_label text default 'Untuk Kelas XII PPLG 1',
  message text not null,
  unlock_at timestamptz not null,
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- View publik untuk menyembunyikan kolom message bila unlock_at > now()
create or replace view public_time_capsules as
select
  id,
  author_name,
  recipient_label,
  case
    when unlock_at <= now() then message
    else null
  end as message,
  (unlock_at <= now()) as is_unlocked,
  unlock_at,
  status,
  created_at
from time_capsules
where status = 'approved';

create table thanks (
  id uuid primary key default gen_random_uuid(),
  from_name text,
  to_name text,
  message text not null,
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table works (
  id uuid primary key default gen_random_uuid(),
  student_id uuid unique not null references students(id) on delete cascade,
  title text not null,
  description text,
  tags text[] default '{}',
  image_url text,
  demo_url text,
  repo_url text,
  status content_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  is_open boolean default true,
  created_at timestamptz not null default now()
);

create table poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references polls(id) on delete cascade,
  label text not null
);

create table poll_votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid references poll_options(id) on delete cascade,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  unique (option_id, voter_hash)
);

create table site_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- Aktifkan Row Level Security (RLS) di semua tabel
alter table students enable row level security;
alter table teachers enable row level security;
alter table moments enable row level security;
alter table dreams enable row level security;
alter table dream_cheers enable row level security;
alter table memory_entries enable row level security;
alter table time_capsules enable row level security;
alter table thanks enable row level security;
alter table works enable row level security;
alter table polls enable row level security;
alter table poll_options enable row level security;
alter table poll_votes enable row level security;
alter table site_settings enable row level security;

-- Kebijakan Baca Publik (Read-Only untuk baris yang disetujui)
create policy "public_read_students" on students for select using (true);
create policy "public_read_teachers" on teachers for select using (true);
create policy "public_read_moments" on moments for select using (status = 'approved');
create policy "public_read_dreams" on dreams for select using (status = 'approved');
create policy "public_read_dream_cheers" on dream_cheers for select using (status = 'approved');
create policy "public_read_memory_entries" on memory_entries for select using (status = 'approved');
-- time_capsules hanya boleh dibaca isi pesannya bila sudah waktunya terbuka
create policy "public_read_unlocked_capsules" on time_capsules for select using (status = 'approved' and unlock_at <= now());
create policy "public_read_thanks" on thanks for select using (status = 'approved');
create policy "public_read_works" on works for select using (status = 'approved');
create policy "public_read_polls" on polls for select using (true);
create policy "public_read_poll_options" on poll_options for select using (true);
create policy "public_read_poll_votes" on poll_votes for select using (true);
create policy "public_read_site_settings" on site_settings for select using (true);

-- Kebijakan Akses Penuh untuk 1 Akun Admin Terdaftar
-- Ganti UUID admin sesuai variabel SUPABASE_ADMIN_UID pada pengaturan proyek Anda
create policy "admin_all_students" on students for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_teachers" on teachers for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_moments" on moments for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_dreams" on dreams for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_dream_cheers" on dream_cheers for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_memory_entries" on memory_entries for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_time_capsules" on time_capsules for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_thanks" on thanks for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_works" on works for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
create policy "admin_all_site_settings" on site_settings for all using (auth.uid() = '00000000-0000-0000-0000-000000000001'::uuid);
