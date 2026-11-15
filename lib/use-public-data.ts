"use client";

import * as React from "react";
import type {
  DreamRow,
  MemoryEntryRow,
  MomentRow,
  PollWithOptions,
  StudentRow,
  TeacherRow,
  ThanksRow,
  TimeCapsuleRow,
  WorkRow,
} from "@/lib/types";

export interface PublicAppDataPayload {
  students: StudentRow[];
  teachers: TeacherRow[];
  moments: MomentRow[];
  dreams: DreamRow[];
  memoryEntries: MemoryEntryRow[];
  timeCapsules: TimeCapsuleRow[];
  thanksList: ThanksRow[];
  works: WorkRow[];
  polls: PollWithOptions[];
  settings: {
    graduation_date: string;
  };
  supabaseConnected: boolean;
  updatedAt?: number;
}

const SYNC_CHANNEL_NAME = "xii_pplg1_backend_sync";
const SYNC_STORAGE_KEY = "xii_pplg1_backend_sync_ts";

/**
 * Pancarkan sinyal pembaruan data ke semua tab/komponen frontend yang terbuka
 * setiap kali Admin mengubah data atau pengguna mengirim/memilih polling.
 */
export function notifyPublicDataUpdated() {
  if (typeof window === "undefined") return;
  const nowStr = String(Date.now());
  try {
    window.localStorage.setItem(SYNC_STORAGE_KEY, nowStr);
  } catch {
    // Ignore storage quota errors
  }
  try {
    if ("BroadcastChannel" in window) {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({ type: "PUBLIC_DATA_UPDATED", timestamp: nowStr });
      ch.close();
    }
  } catch {
    // Ignore BroadcastChannel errors
  }
  try {
    window.dispatchEvent(new CustomEvent("xii-pplg1-data-updated"));
  } catch {
    // Ignore CustomEvent errors
  }
}

/**
 * Hook sinkronisasi langsung ke endpoint backend (/api/content) agar seluruh halaman
 * Frontend selalu menampilkan data terbaru dari Backend tanpa tertahan cache.
 */
export function useLivePublicData(
  initialData?: Partial<PublicAppDataPayload>
): {
  data: Partial<PublicAppDataPayload>;
  refresh: () => Promise<void>;
} {
  const [data, setData] = React.useState<Partial<PublicAppDataPayload>>(
    () => initialData ?? {}
  );

  // Sinkronkan bila prop server berubah setelah navigasi
  React.useEffect(() => {
    if (initialData) {
      setData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/content?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) return;
      const fresh = (await res.json()) as PublicAppDataPayload;
      if (fresh && Array.isArray(fresh.students)) {
        setData(fresh);
      }
    } catch {
      // Tetap gunakan state terakhir bila jaringan sementara terputus
    }
  }, []);

  React.useEffect(() => {
    // Ambil data segar dari backend saat halaman dimuat
    void refresh();

    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SYNC_STORAGE_KEY) {
        void refresh();
      }
    };
    const onCustomUpdate = () => {
      void refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    window.addEventListener("xii-pplg1-data-updated", onCustomUpdate);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        channel.onmessage = () => {
          void refresh();
        };
      } catch {
        channel = null;
      }
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("xii-pplg1-data-updated", onCustomUpdate);
      if (channel) {
        channel.close();
      }
    };
  }, [refresh]);

  return { data, refresh };
}
