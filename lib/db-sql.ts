/**
 * Skema DDL PostgreSQL Idempotent (CREATE TABLE IF NOT EXISTS) beserta Relasi Foreign Key,
 * View Keamanan Kapsul Waktu, dan Kebijakan RLS untuk XII PPLG 1 MAKN Ende.
 * Seluruh tabel dibuat dalam keadaan benar-benar kosong (0 baris data dummy).
 */
export const AUTO_MIGRATE_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE content_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE gender_type AS ENUM ('L', 'P');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE teacher_group AS ENUM ('kejuruan', 'agama', 'akademik');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE moment_grade AS ENUM ('X', 'XI', 'XII');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. students (Anggota Kelas & Sahabat yang Pindah)
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  full_name text NOT NULL,
  nickname text NOT NULL,
  gender gender_type NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  show_photo boolean NOT NULL DEFAULT true,
  photo_url text DEFAULT '',
  bio text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone smallint NOT NULL DEFAULT 1,
  rail_group text NOT NULL DEFAULT 'L',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. teachers (Wali Kelas & Guru Pembimbing)
CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL,
  grp teacher_group NOT NULL,
  is_homeroom boolean NOT NULL DEFAULT false,
  photo_url text DEFAULT '',
  message text NOT NULL DEFAULT '',
  tone smallint NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. moments (Jejak Momen Kelas X, XI, XII)
CREATE TABLE IF NOT EXISTS public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade moment_grade NOT NULL,
  title text NOT NULL,
  caption text NOT NULL,
  date_label text NOT NULL,
  image_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. dreams (Papan Cita-Cita Siswa + Relasi ke students)
CREATE TABLE IF NOT EXISTS public.dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  dream_title text NOT NULL,
  reason text NOT NULL,
  target_place text NOT NULL DEFAULT '',
  pin_color text NOT NULL DEFAULT '#c86d3b',
  cheers_count integer NOT NULL DEFAULT 0,
  status content_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. dream_cheers (Dukungan Semangat pada Dream Board + Relasi ke dreams)
CREATE TABLE IF NOT EXISTS public.dream_cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  message text NOT NULL,
  status content_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. memory_entries (Buku Kenangan Antar-Teman + Relasi ke students)
CREATE TABLE IF NOT EXISTS public.memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  message text NOT NULL,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. time_capsules (Kapsul Waktu Digital)
CREATE TABLE IF NOT EXISTS public.time_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  recipient_label text NOT NULL,
  message text NOT NULL,
  unlock_at timestamptz NOT NULL,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. thanks (Papan Terima Kasih Terbuka)
CREATE TABLE IF NOT EXISTS public.thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL DEFAULT 'Anonim',
  to_target text NOT NULL,
  message text NOT NULL,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. works (Pameran Karya Siswa + Relasi ke students)
CREATE TABLE IF NOT EXISTS public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  image_url text DEFAULT '',
  demo_url text DEFAULT '',
  repo_url text DEFAULT '',
  status content_status NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. polls (Polling Kelas)
CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  category text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. poll_options (Pilihan Polling + Relasi ke polls)
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  votes_count integer NOT NULL DEFAULT 0
);

-- 12. poll_votes (Suara Polling + Relasi ke polls & poll_options)
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, voter_fingerprint)
);

-- 13. site_settings (Pengaturan Situs & Kode Kelas)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  graduation_date date NOT NULL DEFAULT '2026-05-20',
  class_code text NOT NULL DEFAULT 'XIIPPLG1',
  moderation_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- View Keamanan Kapsul Waktu
CREATE OR REPLACE VIEW public.public_time_capsules AS
SELECT
  id,
  author_name,
  recipient_label,
  unlock_at,
  (now() >= unlock_at) AS is_unlocked,
  CASE
    WHEN now() >= unlock_at THEN message
    ELSE NULL
  END AS message,
  created_at
FROM public.time_capsules
WHERE status = 'approved';

-- Aktifkan RLS & Kebijakan Akses agar Supabase Publishable Key dapat Membaca & Menulis
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_capsules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "allow_all_students" ON public.students;
  CREATE POLICY "allow_all_students" ON public.students FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_teachers" ON public.teachers;
  CREATE POLICY "allow_all_teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_moments" ON public.moments;
  CREATE POLICY "allow_all_moments" ON public.moments FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_dreams" ON public.dreams;
  CREATE POLICY "allow_all_dreams" ON public.dreams FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_dream_cheers" ON public.dream_cheers;
  CREATE POLICY "allow_all_dream_cheers" ON public.dream_cheers FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_memory_entries" ON public.memory_entries;
  CREATE POLICY "allow_all_memory_entries" ON public.memory_entries FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_time_capsules" ON public.time_capsules;
  CREATE POLICY "allow_all_time_capsules" ON public.time_capsules FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_thanks" ON public.thanks;
  CREATE POLICY "allow_all_thanks" ON public.thanks FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_works" ON public.works;
  CREATE POLICY "allow_all_works" ON public.works FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_polls" ON public.polls;
  CREATE POLICY "allow_all_polls" ON public.polls FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_poll_options" ON public.poll_options;
  CREATE POLICY "allow_all_poll_options" ON public.poll_options FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_poll_votes" ON public.poll_votes;
  CREATE POLICY "allow_all_poll_votes" ON public.poll_votes FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "allow_all_site_settings" ON public.site_settings;
  CREATE POLICY "allow_all_site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
`;
