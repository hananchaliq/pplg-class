import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE = "xii_pplg1_admin_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours

interface AdminSessionPayload {
  sub: "admin";
  iat: number;
  exp: number;
  jti: string;
}

declare global {
  var __xiiPplgEphemeralSecret: string | undefined;
}

function getHmacSigningKey(): Buffer {
  const envSecret = (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSCODE ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    ""
  ).trim();

  let secret = envSecret;
  if (!secret) {
    if (!globalThis.__xiiPplgEphemeralSecret) {
      globalThis.__xiiPplgEphemeralSecret = crypto
        .randomBytes(32)
        .toString("hex");
    }
    secret = globalThis.__xiiPplgEphemeralSecret;
  }

  return crypto
    .createHash("sha256")
    .update(`xiipplg1-admin-hmac:${secret}`)
    .digest();
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function getExpectedAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || "ADMIN-MAKN-ENDE").trim();
}

export function verifyAdminCredentials(
  inputEmail: string,
  inputPasscode: string
): boolean {
  const expectedPass = getExpectedAdminPasscode();
  const cleanPass = inputPasscode.trim();
  if (!cleanPass || !timingSafeStringEqual(cleanPass, expectedPass)) {
    return false;
  }

  const expectedEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (expectedEmail) {
    const cleanEmail = inputEmail.trim().toLowerCase();
    return timingSafeStringEqual(cleanEmail, expectedEmail);
  }

  return true;
}

export function issueAdminSessionToken(): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: nowSec,
    exp: nowSec + ADMIN_COOKIE_MAX_AGE,
    jti: crypto.randomBytes(12).toString("hex"),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", getHmacSigningKey())
    .update(payloadB64)
    .digest("base64url");
  return `v1.${payloadB64}.${sig}`;
}

export function verifyAdminSessionToken(
  token: string | undefined | null
): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;

  const [, payloadB64, providedSig] = parts;
  if (!payloadB64 || !providedSig) return false;

  const expectedSig = crypto
    .createHmac("sha256", getHmacSigningKey())
    .update(payloadB64)
    .digest("base64url");

  if (!timingSafeStringEqual(providedSig, expectedSig)) {
    return false;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as Partial<AdminSessionPayload>;
    const nowSec = Math.floor(Date.now() / 1000);
    return (
      parsed.sub === "admin" &&
      typeof parsed.exp === "number" &&
      parsed.exp > nowSec
    );
  } catch {
    return false;
  }
}

export function createAdminSessionCookieValue(): string {
  return issueAdminSessionToken();
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function isAuthorizedAdmin(
  req: NextRequest,
  bodyToken?: string
): boolean {
  const cookieVal = req.cookies.get(ADMIN_COOKIE)?.value;
  if (verifyAdminSessionToken(cookieVal)) return true;

  const sessionHeader = req.headers.get("x-admin-session")?.trim();
  if (verifyAdminSessionToken(sessionHeader)) return true;

  const authHeader = req.headers.get("authorization")?.trim();
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (verifyAdminSessionToken(bearerToken)) return true;
  }

  const headerCode = req.headers.get("x-admin-passcode")?.trim();
  if (headerCode && timingSafeStringEqual(headerCode, getExpectedAdminPasscode())) {
    return true;
  }

  if (bodyToken && verifyAdminSessionToken(bodyToken)) return true;

  return false;
}

export function setAdminSessionCookie(res: NextResponse, token?: string): string {
  const sessionToken = token || issueAdminSessionToken();
  res.cookies.set(
    ADMIN_COOKIE,
    sessionToken,
    getAdminSessionCookieOptions(ADMIN_COOKIE_MAX_AGE)
  );
  return sessionToken;
}
