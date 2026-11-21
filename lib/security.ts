import crypto from "node:crypto";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

declare global {
  var __xiiPplgRateBuckets: Map<string, RateLimitBucket> | undefined;
}

function getRateBuckets(): Map<string, RateLimitBucket> {
  if (!globalThis.__xiiPplgRateBuckets) {
    globalThis.__xiiPplgRateBuckets = new Map<string, RateLimitBucket>();
  }
  return globalThis.__xiiPplgRateBuckets;
}

export function getClientIp(req: { headers: Headers }): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const buckets = getRateBuckets();
  const now = Date.now();

  if (buckets.size > 1500) {
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) {
        buckets.delete(k);
      }
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSec: 0,
    };
  }

  if (existing.count >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    );
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
  };
}

export type DetectedImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif";

/**
 * Verify actual image binary magic bytes so spoofed HTML/SVG/script uploads
 * cannot impersonate allowed raster image MIME types.
 */
export function detectImageMimeFromMagicBytes(
  buffer: Buffer
): DetectedImageMime | null {
  if (!buffer || buffer.byteLength < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }

  // GIF87a / GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "image/gif";
  }

  return null;
}

export function hashWithServerSalt(value: string, purpose: string): string {
  const secretSalt =
    (
      process.env.ADMIN_SESSION_SECRET ||
      process.env.ADMIN_PASSCODE ||
      process.env.BLOB_READ_WRITE_TOKEN ||
      "xiipplg1-makn-ende-salt"
    ).trim();

  return crypto
    .createHash("sha256")
    .update(`${purpose}:${secretSalt}:${value}`)
    .digest("hex");
}

export function isSafePostgresConnectionUrl(rawUrl: string): {
  ok: boolean;
  error?: string;
} {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, error: "DATABASE_URL wajib diisi." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Format PostgreSQL URI tidak valid." };
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    return {
      ok: false,
      error: "Protokol koneksi harus postgres:// atau postgresql://.",
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === "169.254.169.254" ||
    host === "metadata.google.internal" ||
    host === "metadata"
  ) {
    return {
      ok: false,
      error: "Host database ditolak oleh kebijakan keamanan.",
    };
  }

  if (
    process.env.NODE_ENV === "production" &&
    (host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0")
  ) {
    return {
      ok: false,
      error: "Host loopback tidak diperbolehkan pada mode produksi.",
    };
  }

  return { ok: true };
}
