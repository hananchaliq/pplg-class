/**
 * Browser- & server-safe URL validation helpers to prevent XSS (`javascript:`, `data:`, `vbscript:`)
 * on user-submitted demo, repository, social, and external image URLs.
 */

const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

export function isSafeHttpUrl(raw: string | undefined | null): boolean {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeSafeUrl(
  raw: string | undefined | null,
  options?: { allowRelative?: boolean }
): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return "";

  if (options?.allowRelative) {
    if (
      trimmed.startsWith("/") &&
      !trimmed.startsWith("//") &&
      !trimmed.includes("\\")
    ) {
      return trimmed;
    }
  }

  return isSafeHttpUrl(trimmed) ? trimmed : "";
}
