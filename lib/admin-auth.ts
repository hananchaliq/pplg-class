import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_COOKIE = "xii_pplg1_admin_session";
export const ADMIN_SESSION_TOKEN = "authenticated_admin_xiipplg1";

export function getExpectedAdminPasscode(): string {
  return (process.env.ADMIN_PASSCODE || "ADMIN-MAKN-ENDE").trim();
}

export function isAuthorizedAdmin(
  req: NextRequest,
  bodyToken?: string
): boolean {
  const cookieVal = req.cookies.get(ADMIN_COOKIE)?.value;
  if (cookieVal === ADMIN_SESSION_TOKEN) return true;

  const sessionHeader = req.headers.get("x-admin-session")?.trim();
  if (sessionHeader === ADMIN_SESSION_TOKEN) return true;

  const authHeader = req.headers.get("authorization")?.trim();
  if (authHeader === `Bearer ${ADMIN_SESSION_TOKEN}`) return true;

  const headerCode = req.headers.get("x-admin-passcode")?.trim();
  if (headerCode && headerCode === getExpectedAdminPasscode()) return true;

  if (bodyToken && bodyToken.trim() === ADMIN_SESSION_TOKEN) return true;

  return false;
}

export function setAdminSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 60 * 12,
  });
}
