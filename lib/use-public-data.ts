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
  dbConnected?: boolean;
  missingTables?: boolean;
  dbError?: string | null;
  updatedAt?: number;
}

const SYNC_CHANNEL_NAME = "xii_pplg1_backend_sync";
const SYNC_STORAGE_KEY = "xii_pplg1_backend_sync_ts";

let sharedClientData: Partial<PublicAppDataPayload> = {};
let inflightRefresh: Promise<PublicAppDataPayload | null> | null = null;

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
 * Pancarkan sinyal saat pengguna mengklik menu navigasi agar loop WebGL 3D
 * segera berhenti dan tidak membuat transisi halaman macet (lag).
 */
export function notifyRouteTransitionStart() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("app:route-transition-start"));
  } catch {
    // Ignore
  }
}

/**
 * Hook sinkronisasi langsung ke endpoint backend (/api/content).
 * Menggunakan initialData dari Server Component secara instan saat pindah menu
 * (tanpa memicu fetch ganda saat mount), dan hanya mem-fetch ulang ketika ada
 * sinyal perubahan dari Admin atau pengiriman form.
 */
export function useLivePublicData(
  initialData?: Partial<PublicAppDataPayload>
): {
  data: Partial<PublicAppDataPayload>;
  refresh: () => Promise<void>;
} {
  const [data, setData] = React.useState<Partial<PublicAppDataPayload>>(() => {
    if (initialData) {
      sharedClientData = { ...sharedClientData, ...initialData };
      return sharedClientData;
    }
    return sharedClientData;
  });

  // Sinkronkan secara instan bila prop dari Server Component berubah setelah navigasi
  React.useEffect(() => {
    if (initialData) {
      sharedClientData = { ...sharedClientData, ...initialData };
      setData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const refresh = React.useCallback(async () => {
    try {
      if (!inflightRefresh) {
        inflightRefresh = fetch(`/api/content?_t=${Date.now()}`, {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        })
          .then(async (res) => {
            if (!res.ok) return null;
            return (await res.json()) as PublicAppDataPayload;
          })
          .catch(() => null)
          .finally(() => {
            inflightRefresh = null;
          });
      }

      const fresh = await inflightRefresh;
      if (fresh && Array.isArray(fresh.students)) {
        sharedClientData = fresh;
        setData(fresh);
      }
    } catch {
      // Tetap gunakan state terakhir bila jaringan sementara terputus
    }
  }, []);

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SYNC_STORAGE_KEY) {
        void refresh();
      }
    };
    const onCustomUpdate = () => {
      void refresh();
    };

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
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("xii-pplg1-data-updated", onCustomUpdate);
      if (channel) {
        channel.close();
      }
    };
  }, [refresh]);

  return { data, refresh };
}
