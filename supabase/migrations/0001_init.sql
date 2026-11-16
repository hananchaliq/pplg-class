-- =============================================================================
-- XII PPLG 1 — MAKN Ende (Auto-Generated Schema, 0 Dummy Data)
-- =============================================================================

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
  CREATE TYPE moment_phase AS ENUM ('X', 'XI', 'XII');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  full_name text NOT NULL,
  nickname text NOT NULL,
  gender gender_type NOT NULL DEFAULT 'L',
  is_active boolean NOT NULL DEFAULT true,
  show_photo boolean NOT NULL DEFAULT true,
  photo_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  tone smallint NOT NULL DEFAULT 1,
  rail_group text NOT NULL DEFAULT 'L',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL,
  grp teacher_group NOT NULL DEFAULT 'kejuruan',
  is_homeroom boolean NOT NULL DEFAULT false,
  photo_url text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  tone smallint NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption text NOT NULL,
  taken_at date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Momen lucu',
  phase moment_phase NOT NULL DEFAULT 'XII',
  uploader_name text NOT NULL,
  featured boolean NOT NULL DEFAULT true,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  dream text NOT NULL,
  reason text NOT NULL,
  paper_color text NOT NULL DEFAULT '#FFF7D6',
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dream_cheers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_id uuid NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  message text NOT NULL,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  message text NOT NULL,
  decor_seed int NOT NULL DEFAULT 101,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_capsules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  recipient_label text NOT NULL DEFAULT 'Untuk Kelas XII PPLG 1',
  message text NOT NULL,
  unlock_at timestamptz NOT NULL,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.public_time_capsules AS
SELECT
  id,
  author_name,
  recipient_label,
  CASE WHEN unlock_at <= now() THEN message ELSE NULL END AS message,
  unlock_at,
  (unlock_at <= now()) AS is_unlocked,
  status,
  created_at
FROM public.time_capsules
WHERE status = 'approved';

CREATE TABLE IF NOT EXISTS public.thanks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_name text NOT NULL,
  to_name text NOT NULL,
  message text NOT NULL,
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL DEFAULT '',
  demo_url text NOT NULL DEFAULT '',
  repo_url text NOT NULL DEFAULT '',
  status content_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  voter_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (option_id, voter_hash)
);

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
