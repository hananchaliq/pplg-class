"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Edit3,
  ShieldCheck,
  LogOut,
  Users,
  GraduationCap,
  Settings,
  Inbox,
  Plus,
  Save,
  Clock,
  Lock,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { DbConnectionGuard } from "@/components/layout/db-connection-guard";
import { notifyPublicDataUpdated } from "@/lib/use-public-data";
import {
  studentToLanyardMember,
  teacherToLanyardMember,
} from "@/lib/domain-logic";
import type {
  ContentStatus,
  DreamCheerRow,
  DreamRow,
  MemoryEntryRow,
  MomentPhase,
  MomentRow,
  PollWithOptions,
  StudentRow,
  TeacherRow,
  ThanksRow,
  WorkRow,
} from "@/lib/types";
import type { ModeratableTable } from "@/lib/db";

async function compressImageToWebp(
  file: File,
  maxSide = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca berkas gambar"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Berkas bukan gambar yang valid"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Kanvas kompresi tidak tersedia"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface RawTimeCapsuleAdmin {
  id: string;
  author_name: string;
  recipient_label: string;
  message: string;
  unlock_at: string;
  status: ContentStatus;
  created_at?: string;
}

interface AdminDashboardData {
  students: StudentRow[];
  teachers: TeacherRow[];
  moments: MomentRow[];
  dreams: DreamRow[];
  dreamCheers: DreamCheerRow[];
  memoryEntries: MemoryEntryRow[];
  timeCapsules: RawTimeCapsuleAdmin[];
  thanksList: ThanksRow[];
  works: WorkRow[];
  polls?: PollWithOptions[];
  settings: {
    graduation_date: string;
  };
  supabaseConnected: boolean;
  dbConnected?: boolean;
  missingTables?: boolean;
  dbError?: string | null;
}

interface QueueRow {
  table: ModeratableTable;
  tableLabel: string;
  id: string;
  author: string;
  subtitle: string;
  text: string;
  status: ContentStatus;
  createdAt?: string;
}

const ADMIN_TOKEN_STORAGE_KEY = "xii_pplg1_admin_token";

function readStoredAdminToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
      window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) ||
      ""
    );
  } catch {
    return "";
  }
}

function writeStoredAdminToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage restriction errors in sandboxed iframes
  }
}

export function AdminClient() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "moderasi" | "siswa" | "guru" | "pengaturan"
  >("moderasi");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">(
    "pending"
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Paginasi Prev/Next di Dasbor Admin agar tidak capek scroll
  const [queuePage, setQueuePage] = useState(1);
  const QUEUE_PER_PAGE = 6;

  const [studentPage, setStudentPage] = useState(1);
  const STUDENTS_PER_PAGE = 9;

  const [teacherPage, setTeacherPage] = useState(1);
  const TEACHERS_PER_PAGE = 9;

  // Form states for student CRUD
  const [editingStudent, setEditingStudent] = useState<Partial<StudentRow> | null>(
    null
  );
  const [studentTagsInput, setStudentTagsInput] = useState("");
  // Form states for teacher CRUD
  const [editingTeacher, setEditingTeacher] = useState<Partial<TeacherRow> | null>(
    null
  );
  // Form state for graduation date & polls
  const [gradDateInput, setGradDateInput] = useState("");
  const [pollQuestionInput, setPollQuestionInput] = useState("");
  const [pollOptionsInput, setPollOptionsInput] = useState("");

  // State Unggah Media Visual 3D (Hero Kanan, Sampul Buku Kenangan, Foto Bersama, Galeri)
  const [mediaTarget, setMediaTarget] = useState<
    | "Foto Hero 3D"
    | "Foto Sampul Buku"
    | "Foto Bersama Kelas"
    | "Kebersamaan Kelas"
  >("Foto Hero 3D");
  const [mediaPhase, setMediaPhase] = useState<MomentPhase>("XII");
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaImageUrl, setMediaImageUrl] = useState("");
  const [mediaUploading, setMediaUploading] = useState(false);

  const getActiveToken = useCallback(
    (overrideToken?: string) =>
      overrideToken || sessionToken || readStoredAdminToken(),
    [sessionToken]
  );

  const adminPost = useCallback(
    async (payload: Record<string, unknown>, overrideToken?: string) => {
      const token = getActiveToken(overrideToken);
      return fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-session": token } : {}),
        },
        body: JSON.stringify({
          ...payload,
          ...(token ? { sessionToken: token } : {}),
        }),
      });
    },
    [getActiveToken]
  );

  const fetchDashboard = useCallback(
    async (overrideToken?: string) => {
      setLoading(true);
      try {
        const token = overrideToken || readStoredAdminToken();
        if (token) setSessionToken(token);
        const res = await fetch("/api/admin", {
          cache: "no-store",
          headers: token ? { "x-admin-session": token } : undefined,
        });
        const json = await res.json();
        if (json.ok && json.authenticated && json.data) {
          setAuthenticated(true);
          setData(json.data);
          setGradDateInput(
            json.data.settings?.graduation_date?.slice(0, 16) ||
              "2026-05-15T08:00"
          );
        } else {
          setAuthenticated(false);
          setData(null);
        }
      } catch {
        setAuthenticated(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setAuthError(
          json.error || "Gagal masuk. Periksa email atau kode sandi admin."
        );
        return;
      }
      const token = String(json.token || "authenticated_admin_xiipplg1");
      setSessionToken(token);
      writeStoredAdminToken(token);
      setPassword("");

      if (json.data) {
        setData(json.data);
        setGradDateInput(
          json.data.settings?.graduation_date?.slice(0, 16) ||
            "2026-05-15T08:00"
        );
        setAuthenticated(true);
        setLoading(false);
      } else {
        setAuthenticated(true);
        await fetchDashboard(token);
      }
    } catch {
      setAuthError("Gagal menghubungi server autentikasi.");
    }
  };

  const handleLogout = async () => {
    await adminPost({ action: "logout" });
    setSessionToken("");
    writeStoredAdminToken("");
    setAuthenticated(false);
    setData(null);
  };

  const queueItems = useMemo<QueueRow[]>(() => {
    if (!data) return [];
    const rows: QueueRow[] = [];

    for (const m of data.memoryEntries) {
      const stu = data.students.find((s) => s.id === m.student_id);
      rows.push({
        table: "memoryEntries",
        tableLabel: "Buku Kenangan",
        id: m.id,
        author: m.author_name,
        subtitle: `Untuk: ${stu?.full_name || m.student_id}`,
        text: m.message,
        status: m.status,
        createdAt: m.created_at,
      });
    }

    for (const d of data.dreams) {
      const stu = data.students.find((s) => s.id === d.student_id);
      rows.push({
        table: "dreams",
        tableLabel: "Dream Board",
        id: d.id,
        author: stu?.full_name || d.student_name || d.student_id,
        subtitle: `Alasan: ${d.reason}`,
        text: d.dream,
        status: d.status,
      });
    }

    for (const c of data.dreamCheers) {
      rows.push({
        table: "dreamCheers",
        tableLabel: "Semangat Dream Board",
        id: c.id,
        author: c.author_name,
        subtitle: `Dream ID: ${c.dream_id}`,
        text: c.message,
        status: c.status,
        createdAt: c.created_at,
      });
    }

    for (const tc of data.timeCapsules) {
      rows.push({
        table: "timeCapsules",
        tableLabel: "Kapsul Waktu",
        id: tc.id,
        author: tc.author_name,
        subtitle: `${tc.recipient_label} (Buka: ${tc.unlock_at.slice(0, 10)})`,
        text: tc.message,
        status: tc.status,
        createdAt: tc.created_at,
      });
    }

    for (const th of data.thanksList) {
      rows.push({
        table: "thanksList",
        tableLabel: "Wall of Thanks",
        id: th.id,
        author: th.from_name,
        subtitle: `Kepada: ${th.to_name}`,
        text: th.message,
        status: th.status,
        createdAt: th.created_at,
      });
    }

    for (const mo of data.moments) {
      rows.push({
        table: "moments",
        tableLabel: "Galeri Momen",
        id: mo.id,
        author: mo.uploader_name,
        subtitle: `Kelas ${mo.phase} • ${mo.category} (${mo.taken_at})`,
        text: mo.caption,
        status: mo.status,
        createdAt: mo.created_at,
      });
    }

    for (const w of data.works) {
      const stu = data.students.find((s) => s.id === w.student_id);
      rows.push({
        table: "works",
        tableLabel: "Karya Siswa",
        id: w.id,
        author: stu?.full_name || w.student_name || w.student_id,
        subtitle: `${w.title} [${w.tags.join(", ")}]`,
        text: w.description,
        status: w.status,
      });
    }

    return rows;
  }, [data]);

  const filteredQueue = useMemo(() => {
    if (statusFilter === "all") return queueItems;
    return queueItems.filter((item) => item.status === statusFilter);
  }, [queueItems, statusFilter]);

  const totalQueuePages = Math.max(
    1,
    Math.ceil(filteredQueue.length / QUEUE_PER_PAGE)
  );
  const pagedQueue = useMemo(() => {
    const safePage = Math.min(queuePage, totalQueuePages);
    return filteredQueue.slice(
      (safePage - 1) * QUEUE_PER_PAGE,
      safePage * QUEUE_PER_PAGE
    );
  }, [filteredQueue, queuePage, totalQueuePages]);

  const pendingCount = useMemo(
    () => queueItems.filter((item) => item.status === "pending").length,
    [queueItems]
  );

  const handleModerate = async (
    table: ModeratableTable,
    id: string,
    status: ContentStatus,
    updatedText?: string
  ) => {
    try {
      const res = await adminPost({
        action: "moderate",
        table,
        id,
        status,
        updatedText,
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
        setEditingKey(null);
        notifyPublicDataUpdated();
        setFeedback(
          `Item berhasil diperbarui menjadi '${status === "approved" ? "Disetujui" : status === "rejected" ? "Ditolak" : "Menunggu"}' dan disinkronkan ke halaman publik.`
        );
      }
    } catch {
      setFeedback("Gagal memperbarui status moderasi.");
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.full_name) return;
    const parsedTags = studentTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await adminPost({
      action: "upsert_student",
      student: {
        ...editingStudent,
        tags: parsedTags.length > 0 ? parsedTags : ["PPLG", "MAKNEnde"],
      },
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      setEditingStudent(null);
      notifyPublicDataUpdated();
      setFeedback("Data siswa berhasil disimpan & langsung diperbarui di frontend.");
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    const res = await adminPost({
      action: "delete_student",
      id,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      if (editingStudent?.id === id) setEditingStudent(null);
      notifyPublicDataUpdated();
      setFeedback(`Data siswa "${name}" berhasil dihapus dari sistem.`);
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher?.full_name || !editingTeacher?.title) return;
    const res = await adminPost({
      action: "upsert_teacher",
      teacher: editingTeacher,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      setEditingTeacher(null);
      notifyPublicDataUpdated();
      setFeedback("Data guru berhasil disimpan & langsung diperbarui di frontend.");
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    const res = await adminPost({
      action: "delete_teacher",
      id,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      if (editingTeacher?.id === id) setEditingTeacher(null);
      notifyPublicDataUpdated();
      setFeedback(`Data guru "${name}" berhasil dihapus dari sistem.`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradDateInput) return;
    const iso = new Date(gradDateInput).toISOString();
    const res = await adminPost({
      action: "settings",
      graduationDate: iso,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      notifyPublicDataUpdated();
      setFeedback("Tanggal kelulusan berhasil diperbarui & disinkronkan ke Beranda.");
    }
  };

  const handleDeleteModeratedItem = async (
    table: ModeratableTable,
    id: string
  ) => {
    const res = await adminPost({
      action: "delete_moderated_item",
      table,
      id,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      notifyPublicDataUpdated();
      setFeedback("Item berhasil dihapus permanen dari database Supabase.");
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = pollOptionsInput
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!pollQuestionInput.trim() || opts.length < 2) {
      setFeedback("Pertanyaan polling dan minimal 2 baris pilihan wajib diisi.");
      return;
    }
    const res = await adminPost({
      action: "create_poll",
      question: pollQuestionInput,
      options: opts,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      setPollQuestionInput("");
      setPollOptionsInput("");
      notifyPublicDataUpdated();
      setFeedback("Polling baru berhasil ditambahkan ke database.");
    }
  };

  const handleUploadVisualMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaImageUrl.trim()) {
      setFeedback("Pilih berkas foto dari perangkat atau masukkan URL gambar terlebih dahulu.");
      return;
    }
    setMediaUploading(true);
    try {
      const defaultCaption =
        mediaTarget === "Foto Hero 3D"
          ? "Kenangan Meja Belajar 3D XII PPLG 1 MAKN Ende"
          : mediaTarget === "Foto Sampul Buku"
            ? "Keluarga Besar UNO · XII PPLG 1 MAKN Ende"
            : mediaTarget === "Foto Bersama Kelas"
              ? "Kebersamaan Satu Angkatan XII PPLG 1 MAKN Ende"
              : "Momen Kenangan XII PPLG 1";

      const res = await adminPost({
        action: "upsert_moment",
        category: mediaTarget,
        phase: mediaPhase,
        caption: mediaCaption.trim() || defaultCaption,
        uploaderName: "Admin XII PPLG 1",
        imageUrl: mediaImageUrl.trim(),
        replaceExistingCategory: mediaTarget === "Foto Sampul Buku",
      });
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
        setMediaCaption("");
        setMediaImageUrl("");
        notifyPublicDataUpdated();
        setFeedback(
          `Foto "${mediaTarget}" berhasil diunggah ke database dan langsung tampil di model 3D & halaman publik!`
        );
      } else {
        setFeedback(json.error || "Gagal menyimpan foto ke database.");
      }
    } catch {
      setFeedback("Gagal mengunggah foto ke server.");
    } finally {
      setMediaUploading(false);
    }
  };

  const handleDeletePoll = async (id: string) => {
    const res = await adminPost({
      action: "delete_poll",
      id,
    });
    const json = await res.json();
    if (json.ok && json.data) {
      setData(json.data);
      notifyPublicDataUpdated();
      setFeedback("Polling berhasil dihapus dari database Supabase.");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <p className="text-sm text-muted-foreground">
          Memuat ruang pengurus kelas XII PPLG 1...
        </p>
      </div>
    );
  }

  if (!authenticated || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-accent-warm)]/15 text-[var(--color-accent-warm)]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">
                Dasbor Admin Kelas
              </h1>
              <p className="text-xs text-muted-foreground">
                Pengurus Kelas XII PPLG 1 — MAKN Ende
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1 block text-xs font-semibold text-foreground"
              >
                Email Admin Supabase (Opsional bila memakai kode sandi)
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pengurus@makn-ende.sch.id"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1 block text-xs font-semibold text-foreground"
              >
                Kata Sandi / Kode Pengurus Kelas
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kode sandi admin..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>

            {authError && (
              <div
                role="alert"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300"
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--color-accent-warm)] px-4 py-2.5 text-sm font-semibold text-[#fbf6ec] transition hover:opacity-90"
            >
              Masuk ke Dasbor Moderasi
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const activeStudentsCount = data.students.filter((s) => s.is_active).length;
  const movedStudentsCount = data.students.filter((s) => !s.is_active).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header Admin */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-[var(--color-chart-1)]" />
            <span>Ruang Moderasi & Pengurus Kelas XII PPLG 1</span>
          </div>
          <h1 className="mt-1 font-serif text-3xl font-bold text-foreground">
            Dasbor Admin Album Kenangan
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Database:{" "}
            <strong className="text-foreground">
              {data.dbConnected ?? data.supabaseConnected
                ? "Supabase PostgreSQL Aktif"
                : "Belum Terkoneksi / Tabel Belum Siap"}
            </strong>
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <LogOut className="h-3.5 w-3.5" />
            Keluar
          </button>
        </div>
      </div>

      {data.dbConnected === false && (
        <div className="mb-8">
          <DbConnectionGuard
            dbConnected={false}
            missingTables={data.missingTables}
            dbError={data.dbError}
          >
            {null}
          </DbConnectionGuard>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="mb-6 flex items-center justify-between rounded-lg border border-[var(--color-chart-1)]/40 bg-card px-4 py-3 text-sm text-foreground shadow-sm"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Navigasi Tab Admin */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("moderasi")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "moderasi"
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Antrean Moderasi</span>
          <span className="rounded-full bg-[var(--color-chart-2)] px-2 py-0.5 text-xs font-bold text-white">
            {pendingCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("siswa")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "siswa"
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Data Siswa ({data.students.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("guru")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "guru"
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-muted"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Data Guru ({data.teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pengaturan")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "pengaturan"
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-muted"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Pengaturan Situs</span>
        </button>
      </div>

      {/* TAB 1: ANTREAN MODERASI (Dengan Paginasi Prev/Next Icon) */}
      {activeTab === "moderasi" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "rejected", "all"] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setQueuePage(1);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      statusFilter === st
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st === "pending"
                      ? `Menunggu Persetujuan (${pendingCount})`
                      : st === "approved"
                        ? "Sudah Disetujui"
                        : st === "rejected"
                           ? "Ditolak"
                          : "Semua Kiriman"}
                  </button>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Menampilkan {filteredQueue.length} item
            </p>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <p className="font-serif text-lg font-semibold text-foreground">
                Tidak ada kiriman pada filter ini
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Semua kiriman dengan status ini sudah selesai ditinjau.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedQueue.map((item) => {
                const rowKey = `${item.table}:${item.id}`;
                const isEditing = editingKey === rowKey;
                return (
                  <div
                    key={rowKey}
                    data-testid={`moderation-row-${item.id}`}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-foreground">
                            {item.tableLabel}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {item.author}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {item.subtitle}
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={3}
                              className="w-full rounded-lg border border-border bg-background p-2.5 text-sm text-foreground"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleModerate(
                                    item.table,
                                    item.id,
                                    "approved",
                                    editingText
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-chart-1)] px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Simpan & Setujui
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingKey(null)}
                                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                            {item.text}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingKey(rowKey);
                            setEditingText(item.text);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleModerate(item.table, item.id, "approved")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-chart-1)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Setujui
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleModerate(item.table, item.id, "rejected")
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteModeratedItem(item.table, item.id)
                          }
                          title="Hapus permanen dari database"
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-500/20 dark:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <PaginationBar
                currentPage={Math.min(queuePage, totalQueuePages)}
                totalPages={totalQueuePages}
                totalItems={filteredQueue.length}
                pageSize={QUEUE_PER_PAGE}
                onPageChange={setQueuePage}
                itemLabel="kiriman moderasi"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRUD SISWA (Dengan Paginasi Prev/Next Icon) */}
      {activeTab === "siswa" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Kelola Daftar Siswa ({activeStudentsCount} Aktif + {movedStudentsCount} Pernah Bersama Kita)
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingStudent({
                  full_name: "",
                  nickname: "",
                  gender: "L",
                  is_active: true,
                  show_photo: true,
                  bio: "",
                  tags: ["Frontend", "React", "UI/UX"],
                  rail_group: "L",
                  tone: 1,
                });
                setStudentTagsInput("Frontend, React, UI/UX");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </button>
          </div>

          {editingStudent && (
            <form
              onSubmit={handleSaveStudent}
              className="rounded-xl border border-border bg-card p-5 shadow-md"
            >
              <h3 className="mb-4 font-serif text-lg font-bold text-foreground">
                {editingStudent.id ? "Edit Profil Siswa" : "Tambah Siswa Baru"}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.full_name || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Nama Panggilan
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nickname || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        nickname: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Gender & Kategori Barisan
                  </label>
                  <select
                    value={editingStudent.rail_group || "L"}
                    onChange={(e) => {
                      const rg = e.target.value as StudentRow["rail_group"];
                      setEditingStudent({
                        ...editingStudent,
                        rail_group: rg,
                        gender:
                          rg === "L"
                            ? "L"
                            : rg === "P1" || rg === "P2"
                              ? "P"
                              : editingStudent.gender || "L",
                        is_active: rg !== "moved",
                      });
                    }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="L">Siswa Putra (L)</option>
                    <option value="P1">Siswi Putri (P1)</option>
                    <option value="P2">Siswi Putri (P2)</option>
                    <option value="moved">
                      Pernah Bersama Kita (Siswa Pindah)
                    </option>
                  </select>
                </div>
                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={editingStudent.show_photo ?? true}
                      onChange={(e) =>
                        setEditingStudent({
                          ...editingStudent,
                          show_photo: e.target.checked,
                        })
                      }
                    />
                    Tampilkan Foto (Matikan untuk siluet hangat)
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">
                    Keahlian / Tag Skill Map (pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={studentTagsInput}
                    onChange={(e) => setStudentTagsInput(e.target.value)}
                    placeholder="Frontend, React, UI/UX"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2 rounded-xl border border-border bg-background/70 p-4">
                  <label className="mb-2 block text-xs font-semibold text-foreground">
                    Foto Kartu ID Siswa (Otomatis Sinkron ke ID Card 3D/2D, Project & Buku Kenangan)
                  </label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--color-accent-warm)] bg-muted shadow-xs">
                      {editingStudent.photo_url ? (
                        <img
                          src={editingStudent.photo_url}
                          alt={editingStudent.full_name || "Preview Siswa"}
                          referrerPolicy="no-referrer"
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-warm)] px-3.5 py-2 text-xs font-semibold text-[#fbf6ec] shadow-2xs hover:opacity-90">
                          <Upload className="size-3.5" />
                          <span>Unggah Foto dari Perangkat</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const webp = await compressImageToWebp(file, 960, 0.84);
                                setEditingStudent({
                                  ...editingStudent,
                                  photo_url: webp,
                                  show_photo: true,
                                });
                                setFeedback(
                                  "Foto siswa siap disimpan. Klik 'Simpan Siswa' di bawah untuk menerapkan ke Kartu ID."
                                );
                              } catch {
                                setFeedback("Gagal membaca berkas gambar siswa.");
                              }
                            }}
                          />
                        </label>
                        {editingStudent.photo_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingStudent({
                                ...editingStudent,
                                photo_url: "",
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-3.5" />
                            <span>Hapus Foto (Gunakan Siluet)</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editingStudent.photo_url || ""}
                        onChange={(e) =>
                          setEditingStudent({
                            ...editingStudent,
                            photo_url: e.target.value,
                            show_photo:
                              e.target.value.trim().length > 0
                                ? true
                                : editingStudent.show_photo,
                          })
                        }
                        placeholder="Atau tempel URL foto kustom (https://...) — kosongkan untuk avatar otomatis"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">
                    Bio / Kutipan Singkat
                  </label>
                  <input
                    type="text"
                    value={editingStudent.bio || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        bio: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background"
                  >
                    Simpan Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold"
                  >
                    Batal
                  </button>
                </div>
                {editingStudent.id && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteStudent(
                        editingStudent.id!,
                        editingStudent.full_name || "Siswa"
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Siswa
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.students
              .slice(
                (studentPage - 1) * STUDENTS_PER_PAGE,
                studentPage * STUDENTS_PER_PAGE
              )
              .map((s, idx) => {
                const previewCard = studentToLanyardMember(s, idx);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-[var(--color-accent-warm)]/50 bg-muted">
                        {previewCard.image ? (
                          <img
                            src={previewCard.image}
                            alt={s.full_name}
                            referrerPolicy="no-referrer"
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-serif font-bold text-foreground">
                          {s.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{s.nickname} •{" "}
                          {s.is_active ? `Aktif (${s.gender})` : "Sahabat Pindah"} •{" "}
                          {s.photo_url ? "Foto Asli Diunggah" : s.show_photo ? "Avatar ID" : "Siluet Hangat"}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {s.bio}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudent(s);
                          setStudentTagsInput((s.tags || []).join(", "));
                        }}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                      >
                        Edit / Foto
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <PaginationBar
            currentPage={studentPage}
            totalPages={Math.max(
              1,
              Math.ceil(data.students.length / STUDENTS_PER_PAGE)
            )}
            totalItems={data.students.length}
            pageSize={STUDENTS_PER_PAGE}
            onPageChange={setStudentPage}
            itemLabel="data siswa"
          />
        </div>
      )}

      {/* TAB 3: CRUD GURU (Dengan Paginasi Prev/Next Icon) */}
      {activeTab === "guru" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Kelola Daftar Guru & Wali Kelas ({data.teachers.length} Guru)
            </h2>
            <button
              type="button"
              onClick={() =>
                setEditingTeacher({
                  full_name: "",
                  title: "",
                  grp: "kejuruan",
                  is_homeroom: false,
                  message: "",
                  tone: 1,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-xs font-semibold text-background"
            >
              <Plus className="h-4 w-4" />
              Tambah Guru
            </button>
          </div>

          {editingTeacher && (
            <form
              onSubmit={handleSaveTeacher}
              className="rounded-xl border border-border bg-card p-5 shadow-md"
            >
              <h3 className="mb-4 font-serif text-lg font-bold text-foreground">
                {editingTeacher.id ? "Edit Profil Guru" : "Tambah Guru Baru"}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Nama Lengkap & Gelar
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.full_name || ""}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        full_name: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Mata Pelajaran / Jabatan
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTeacher.title || ""}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        title: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">
                    Kelompok Rumpun
                  </label>
                  <select
                    value={editingTeacher.grp || "kejuruan"}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        grp: e.target.value as TeacherRow["grp"],
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="kejuruan">Rumpun Kejuruan PPLG</option>
                    <option value="agama">Rumpun Pendidikan Agama</option>
                    <option value="akademik">Rumpun Akademik Umum</option>
                  </select>
                </div>
                <div className="flex items-center gap-6 pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={Boolean(editingTeacher.is_homeroom)}
                      onChange={(e) =>
                        setEditingTeacher({
                          ...editingTeacher,
                          is_homeroom: e.target.checked,
                        })
                      }
                    />
                    Jadikan Wali Kelas XII PPLG 1
                  </label>
                </div>
                <div className="sm:col-span-2 rounded-xl border border-border bg-background/70 p-4">
                  <label className="mb-2 block text-xs font-semibold text-foreground">
                    Foto Profil & Kartu ID Guru / Wali Kelas
                  </label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--color-accent-warm)] bg-muted shadow-xs">
                      {editingTeacher.photo_url ? (
                        <img
                          src={editingTeacher.photo_url}
                          alt={editingTeacher.full_name || "Preview Guru"}
                          referrerPolicy="no-referrer"
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="size-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-warm)] px-3.5 py-2 text-xs font-semibold text-[#fbf6ec] shadow-2xs hover:opacity-90">
                          <Upload className="size-3.5" />
                          <span>Unggah Foto Guru / Wali Kelas</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const webp = await compressImageToWebp(file, 960, 0.84);
                                setEditingTeacher({
                                  ...editingTeacher,
                                  photo_url: webp,
                                });
                                setFeedback(
                                  "Foto guru siap disimpan. Klik 'Simpan Guru' untuk menyinkronkan ke Wali Kelas & Kartu ID."
                                );
                              } catch {
                                setFeedback("Gagal membaca berkas gambar guru.");
                              }
                            }}
                          />
                        </label>
                        {editingTeacher.photo_url && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditingTeacher({
                                ...editingTeacher,
                                photo_url: "",
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-3.5" />
                            <span>Hapus Foto</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Atau tempel URL foto guru (https://...)"
                        value={editingTeacher.photo_url || ""}
                        onChange={(e) =>
                          setEditingTeacher({
                            ...editingTeacher,
                            photo_url: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">
                    Pesan Singkat untuk XII PPLG 1
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.message || ""}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        message: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background"
                  >
                    Simpan Guru
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTeacher(null)}
                    className="rounded-lg border border-border px-4 py-2 text-xs font-semibold"
                  >
                    Batal
                  </button>
                </div>
                {editingTeacher.id && (
                  <button
                    type="button"
                    onClick={() =>
                      handleDeleteTeacher(
                        editingTeacher.id!,
                        editingTeacher.full_name || "Guru"
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Guru
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.teachers
              .slice(
                (teacherPage - 1) * TEACHERS_PER_PAGE,
                teacherPage * TEACHERS_PER_PAGE
              )
              .map((t) => {
                const previewTeacher = teacherToLanyardMember(t);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-[var(--color-accent-warm)]/50 bg-muted">
                        {previewTeacher.image ? (
                          <img
                            src={previewTeacher.image}
                            alt={t.full_name}
                            referrerPolicy="no-referrer"
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-serif font-bold text-foreground">
                          {t.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.title} • {t.grp.toUpperCase()}
                          {t.is_homeroom ? " • WALI KELAS" : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingTeacher(t)}
                      className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                    >
                      Edit / Foto
                    </button>
                  </div>
                );
              })}
          </div>

          <PaginationBar
            currentPage={teacherPage}
            totalPages={Math.max(
              1,
              Math.ceil(data.teachers.length / TEACHERS_PER_PAGE)
            )}
            totalItems={data.teachers.length}
            pageSize={TEACHERS_PER_PAGE}
            onPageChange={setTeacherPage}
            itemLabel="data guru"
          />
        </div>
      )}

      {/* TAB 4: PENGATURAN SITUS, MEDIA VISUAL 3D & POLLING KELAS */}
      {activeTab === "pengaturan" && (
        <div className="space-y-8">
          {/* Panel Unggah Foto Model 3D Hero Kanan, Sampul Buku Kenangan, Foto Bersama & Galeri */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="h-5 w-5 text-[var(--color-accent-warm)]" />
                <h2 className="font-serif text-xl font-bold text-foreground">
                  Unggah Foto Model 3D Hero Kanan, Sampul Buku Kenangan, Foto Bersama & Galeri
                </h2>
              </div>
              <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground">
                Langsung Aktif di 3D & 2D Tanpa Antrean
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Unggah gambar dari perangkat Anda untuk ditampilkan di bingkai foto & Polaroid meja 3D sebelah kanan halaman Hero, 1 foto bersama pada sampul depan Buku Kenangan XII PPLG 1 (3D & 2D), halaman pembuka foto bersama sebelum Daftar Isi, serta gantungan foto 3D Galeri.
            </p>

            <form
              onSubmit={handleUploadVisualMedia}
              className="mt-5 grid grid-cols-1 gap-4 rounded-xl border border-border bg-background/70 p-4 lg:grid-cols-12"
            >
              <div className="space-y-3 lg:col-span-7">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Target Lokasi Tampil (3D & 2D)
                    </label>
                    <select
                      value={mediaTarget}
                      onChange={(e) =>
                        setMediaTarget(
                          e.target.value as
                            | "Foto Hero 3D"
                            | "Foto Sampul Buku"
                            | "Foto Bersama Kelas"
                            | "Kebersamaan Kelas"
                        )
                      }
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <option value="Foto Hero 3D">
                        1. Model 3D Kanan Halaman Hero (+ Galeri)
                      </option>
                      <option value="Foto Sampul Buku">
                        2. Sampul Depan Buku Kenangan XII PPLG 1 (1 Foto Bersama)
                      </option>
                      <option value="Foto Bersama Kelas">
                        3. Halaman Pembuka Foto Bersama Buku Kenangan (Hal. 1–4)
                      </option>
                      <option value="Kebersamaan Kelas">
                        4. Gantungan Polaroid 3D & Daftar Galeri Momen
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Fase Rak Galeri 3D
                    </label>
                    <select
                      value={mediaPhase}
                      onChange={(e) => setMediaPhase(e.target.value as MomentPhase)}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <option value="XII">Kelas XII (Senja Terakhir)</option>
                      <option value="XI">Kelas XI (Masa PKL & Proyek)</option>
                      <option value="X">Kelas X (Awal Perjumpaan)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    Keterangan / Caption Foto Bersama
                  </label>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Mis. Foto Bersama Keluarga Besar UNO XII PPLG 1 di Lapangan MAKN Ende"
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] shadow-2xs hover:opacity-90">
                    <Upload className="size-4" />
                    <span>Pilih File Gambar dari Perangkat</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const webp = await compressImageToWebp(file, 1400, 0.84);
                          setMediaImageUrl(webp);
                        } catch {
                          setFeedback("Gagal memproses berkas gambar.");
                        }
                      }}
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={mediaUploading || !mediaImageUrl.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90 disabled:opacity-50"
                  >
                    <Save className="size-4" />
                    <span>
                      {mediaUploading
                        ? "Menyimpan ke Database..."
                        : "Simpan & Tampilkan di 3D/2D"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-3 lg:col-span-5">
                {mediaImageUrl ? (
                  <div className="w-full space-y-2 text-center">
                    <div className="relative mx-auto aspect-[16/10] max-h-44 overflow-hidden rounded-lg border border-border bg-black/80">
                      <img
                        src={mediaImageUrl}
                        alt="Pratinjau Unggahan"
                        referrerPolicy="no-referrer"
                        className="size-full object-contain"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaImageUrl("")}
                      className="text-[11px] font-semibold text-red-600 hover:underline"
                    >
                      Ganti / Hapus Pratinjau
                    </button>
                  </div>
                ) : (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Belum ada foto dipilih. Klik <strong>&ldquo;Pilih File Gambar dari Perangkat&rdquo;</strong> untuk mengunggah foto Hero 3D, Sampul Buku Kenangan, atau Foto Bersama.
                  </p>
                )}
              </div>
            </form>

            {/* Daftar Foto Visual yang Sudah Tersimpan di Database */}
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Koleksi Foto Hero 3D, Sampul Buku, Foto Bersama & Galeri Aktif ({data.moments.filter((m) => m.image_url && !m.image_url.startsWith("/api/moment-illustration")).length} Foto Asli)
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {data.moments
                  .filter(
                    (m) =>
                      m.image_url &&
                      !m.image_url.startsWith("/api/moment-illustration")
                  )
                  .slice(0, 8)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-background p-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          <img
                            src={m.image_url}
                            alt={m.caption}
                            referrerPolicy="no-referrer"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="inline-block rounded bg-[var(--color-accent-warm)]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--color-accent-warm)]">
                            {m.category} · {m.phase}
                          </span>
                          <p className="mt-0.5 truncate text-xs font-semibold text-foreground">
                            {m.caption}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteModeratedItem("moments", m.id)}
                        className="shrink-0 rounded-lg bg-red-600/10 p-1.5 text-red-600 hover:bg-red-600 hover:text-white"
                        title="Hapus Foto"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-5 h-fit">
              <div className="mb-4 flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-[var(--color-chart-2)]" />
                <h2 className="font-serif text-xl font-bold text-foreground">
                  Pengaturan Hitung Mundur Kelulusan
                </h2>
              </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Jika waktu kelulusan di masa depan, Beranda menampilkan hitung
              mundur. Jika sudah terlampaui, Beranda otomatis beralih ke mode{" "}
              <strong>&ldquo;Waktu sejak kita lulus&rdquo;</strong>.
            </p>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label
                  htmlFor="graduation-date-input"
                  className="mb-1 block text-xs font-semibold text-foreground"
                >
                  Tanggal & Waktu Kelulusan (WITA)
                </label>
                <input
                  id="graduation-date-input"
                  type="datetime-local"
                  value={gradDateInput}
                  onChange={(e) => setGradDateInput(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90"
              >
                Simpan Pengaturan Tanggal
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-7">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Kelola Polling Kelas (/main)
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tambahkan atau hapus polling kelas di database Supabase.
            </p>

            <form onSubmit={handleCreatePoll} className="mt-4 space-y-3 border-b border-border pb-6">
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Pertanyaan Polling Baru
                </label>
                <input
                  type="text"
                  required
                  value={pollQuestionInput}
                  onChange={(e) => setPollQuestionInput(e.target.value)}
                  placeholder="Mis. Momen paling tak terlupakan di XII PPLG 1?"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">
                  Daftar Pilihan Jawaban (1 baris = 1 pilihan, minimal 2 baris)
                </label>
                <textarea
                  rows={4}
                  required
                  value={pollOptionsInput}
                  onChange={(e) => setPollOptionsInput(e.target.value)}
                  placeholder={"Begadang ngerjain projek akhir\nPraktik Kerja Lapangan (PKL)\nMakan bareng di kantin madrasah"}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-warm)] px-4 py-2 text-xs font-semibold text-[#fbf6ec] hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Polling ke Database</span>
              </button>
            </form>

            <div className="mt-5 space-y-3">
              {(data.polls ?? []).length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  Belum ada polling di database Supabase (0 data).
                </p>
              ) : (
                (data.polls ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-4"
                  >
                    <div>
                      <p className="font-serif text-sm font-bold text-foreground">
                        {p.question}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.options.map((o) => `${o.label} (${o.votes})`).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePoll(p.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
