"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  RefreshCw,
  ServerCrash,
  Sparkles,
  Terminal,
} from "lucide-react";
import { AUTO_MIGRATE_SQL } from "@/lib/db-sql";
import { notifyPublicDataUpdated } from "@/lib/use-public-data";

export function DbConnectionGuard({
  dbConnected,
  missingTables = false,
  dbError,
  children,
}: {
  dbConnected: boolean;
  missingTables?: boolean;
  dbError?: string | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [databaseUrl, setDatabaseUrl] = React.useState("");
  const [initializing, setInitializing] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showSql, setShowSql] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  if (dbConnected) {
    return <>{children}</>;
  }

  const handleAutoCreateTables = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitializing(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/db-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.dbConnected) {
        setStatusMsg({
          ok: true,
          text:
            json.message ||
            "Seluruh 12 tabel & relasi berhasil dibuat otomatis di Supabase (0 data dummy)! Memuat halaman...",
        });
        notifyPublicDataUpdated();
        router.refresh();
        window.location.reload();
      } else {
        setStatusMsg({
          ok: false,
          text:
            json.error ||
            "Gagal membuat tabel otomatis. Pastikan DATABASE_URL (PostgreSQL URI) benar atau jalankan SQL di bawah.",
        });
      }
    } catch {
      setStatusMsg({
        ok: false,
        text: "Gagal menghubungi endpoint inisialisasi database.",
      });
    } finally {
      setInitializing(false);
    }
  };

  const handleRecheckConnection = async () => {
    setChecking(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/db-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.dbConnected) {
        setStatusMsg({
          ok: true,
          text: "Koneksi database & tabel Supabase telah aktif! Memuat halaman...",
        });
        notifyPublicDataUpdated();
        router.refresh();
        window.location.reload();
      } else {
        setStatusMsg({
          ok: false,
          text:
            json.error ||
            "Database masih belum siap. Pastikan tabel sudah dibuat.",
        });
      }
    } catch {
      setStatusMsg({
        ok: false,
        text: "Gagal memeriksa ulang status database.",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(AUTO_MIGRATE_SQL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowSql(true);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="overflow-hidden rounded-3xl border-2 border-primary/50 bg-card text-card-foreground shadow-xl">
        <div className="ikat-divider" aria-hidden="true" />

        <div className="p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {missingTables ? (
                  <Database className="size-6" />
                ) : (
                  <ServerCrash className="size-6" />
                )}
              </div>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Peringatan Koneksi Database Supabase
                </p>
                <h1 className="mt-0.5 font-serif text-2xl font-bold text-foreground sm:text-3xl">
                  {missingTables
                    ? "Tabel Database Belum Diinisialisasi di Supabase"
                    : "Koneksi Database Belum Aktif"}
                </h1>
              </div>
            </div>

            <button
              type="button"
              disabled={checking}
              onClick={handleRecheckConnection}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw
                className={`size-4 ${checking ? "animate-spin" : ""}`}
              />
              <span>
                {checking ? "Memeriksa..." : "Cek Ulang Koneksi Database"}
              </span>
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Sesuai pengaturan sistem, aplikasi ini{" "}
            <strong className="text-foreground">
              tidak menampilkan data dummy sama sekali
            </strong>{" "}
            dan berpatokan 100% pada database Supabase PostgreSQL. Saat tabel dibuat, seluruh tabel akan dibiarkan{" "}
            <strong className="text-foreground">kosong (0 data)</strong> agar
            dapat Anda kelola sepenuhnya dari Dasbor Admin.
          </p>

          {dbError && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-muted/60 p-4 text-xs leading-relaxed text-foreground"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-bold">Detail Status dari Supabase:</p>
                <p className="mt-0.5 font-mono text-[11px] opacity-90">
                  {dbError}
                </p>
              </div>
            </div>
          )}

          {/* OPSI 1: AUTO-CREATE TABLES VIA DATABASE_URL DARI WEB */}
          <div className="mt-6 rounded-2xl border border-border bg-background p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-4" />
              <span>
                Cara 1: Biarkan Web Ini Membuat Seluruh Tabel & Relasi Otomatis
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Karena kunci{" "}
              <code className="font-mono text-foreground">
                sb_publishable_...
              </code>{" "}
              hanya mengizinkan baca/tulis data (REST API) dan tidak mengizinkan{" "}
              <code className="font-mono text-foreground">CREATE TABLE</code>{" "}
              tanpa koneksi PostgreSQL langsung, masukkan{" "}
              <strong className="text-foreground">DATABASE_URL</strong>{" "}
              (Connection String URI dari menu{" "}
              <em>Supabase Dashboard → Connect → Transaction/Session Pooler</em>
              ) di bawah ini atau tambahkan ke variabel environment{" "}
              <code className="font-mono text-foreground">DATABASE_URL</code>,
              lalu klik tombol di bawah agar web ini membuat seluruh 12 tabel,
              relasi Foreign Key, dan policy RLS secara otomatis:
            </p>

            <form onSubmit={handleAutoCreateTables} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="db-url-input"
                  className="block text-xs font-semibold text-foreground"
                >
                  PostgreSQL Connection String (DATABASE_URL)
                </label>
                <input
                  id="db-url-input"
                  type="password"
                  value={databaseUrl}
                  onChange={(e) => setDatabaseUrl(e.target.value)}
                  placeholder="postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
                  className="mt-1.5 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 font-mono text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={initializing}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  <Database className="size-4" />
                  <span>
                    {initializing
                      ? "Membuat 12 Tabel & Relasi..."
                      : "Buat Seluruh Tabel & Relasi Otomatis Sekarang (0 Data)"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* OPSI 2: SALIN SKEMA SQL YANG DIGENERATE WEB */}
          <div className="mt-5 rounded-2xl border border-border bg-background p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  <Terminal className="size-4 text-primary" />
                  <span>
                    Cara 2: Tanpa DATABASE_URL (Gunakan SQL Generator Web Ini)
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Jika Anda hanya ingin menggunakan{" "}
                  <code className="font-mono text-foreground">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>{" "}
                  dan{" "}
                  <code className="font-mono text-foreground">
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  </code>
                  , salin skema DDL otomatis di bawah lalu jalankan satu kali di{" "}
                  <strong className="text-foreground">
                    Supabase SQL Editor
                  </strong>
                  , kemudian klik <strong>Cek Ulang Koneksi Database</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background transition hover:opacity-90"
                >
                  <Copy className="size-3.5" />
                  <span>
                    {copied ? "✓ SQL Berhasil Disalin!" : "Salin SQL Otomatis"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSql((v) => !v)}
                  className="inline-flex min-h-[38px] items-center rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  {showSql ? "Sembunyikan SQL" : "Lihat Skrip SQL"}
                </button>
              </div>
            </div>

            {showSql && (
              <pre className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-border bg-[#161614] p-4 font-mono text-[11px] leading-relaxed text-[#E8E5DC]">
                {AUTO_MIGRATE_SQL}
              </pre>
            )}
          </div>

          {statusMsg && (
            <div
              role="status"
              className={`mt-5 flex items-start gap-2.5 rounded-2xl border p-4 text-xs font-medium ${
                statusMsg.ok
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-destructive/50 bg-destructive/10 text-foreground"
              }`}
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{statusMsg.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
