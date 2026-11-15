export type ContentStatus = "pending" | "approved" | "rejected";
export type GenderType = "L" | "P";
export type TeacherGroup = "kejuruan" | "agama" | "akademik";
export type MomentPhase = "X" | "XI" | "XII";
export type RailGroup = "L" | "P1" | "P2" | "moved";

export interface StudentLink {
  label: string;
  href: string;
}

export interface StudentRow {
  id: string;
  slug: string;
  full_name: string;
  nickname: string;
  gender: GenderType;
  is_active: boolean;
  show_photo: boolean;
  photo_url: string;
  bio: string;
  tags: string[];
  links: StudentLink[];
  tone: 1 | 2 | 3 | 4 | 5;
  rail_group: RailGroup;
  sort_order: number;
}

export interface TeacherRow {
  id: string;
  full_name: string;
  title: string;
  grp: TeacherGroup;
  is_homeroom: boolean;
  photo_url: string;
  message: string;
  tone: 1 | 2 | 3 | 4 | 5;
  sort_order: number;
}

export interface MomentRow {
  id: string;
  image_url: string;
  caption: string;
  taken_at: string;
  category: string;
  phase: MomentPhase;
  uploader_name: string;
  featured: boolean;
  status: ContentStatus;
  created_at?: string;
}

export interface DreamCheerRow {
  id: string;
  dream_id: string;
  author_name: string;
  message: string;
  status: ContentStatus;
  created_at?: string;
}

export interface DreamRow {
  id: string;
  student_id: string;
  student_name?: string;
  student_nickname?: string;
  dream: string;
  reason: string;
  paper_color: string;
  status: ContentStatus;
  cheers?: DreamCheerRow[];
}

export interface MemoryEntryRow {
  id: string;
  student_id: string;
  author_name: string;
  message: string;
  decor_seed: number;
  status: ContentStatus;
  created_at?: string;
}

export interface TimeCapsuleRow {
  id: string;
  author_name: string;
  recipient_label: string;
  /** Disembunyikan (null) oleh server bila unlock_at > now() */
  message: string | null;
  unlock_at: string;
  is_unlocked: boolean;
  status: ContentStatus;
  created_at?: string;
}

export interface ThanksRow {
  id: string;
  from_name: string;
  to_name: string;
  message: string;
  status: ContentStatus;
  created_at?: string;
}

export interface WorkRow {
  id: string;
  student_id: string;
  student_name?: string;
  title: string;
  description: string;
  tags: string[];
  image_url: string;
  demo_url: string;
  repo_url?: string;
  status: ContentStatus;
}

export interface PollOptionWithVotes {
  id: string;
  poll_id: string;
  label: string;
  votes: number;
}

export interface PollWithOptions {
  id: string;
  question: string;
  is_open: boolean;
  options: PollOptionWithVotes[];
  total_votes: number;
}
