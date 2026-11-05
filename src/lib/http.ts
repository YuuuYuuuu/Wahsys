import { NextResponse } from "next/server";
import { verifyAccessToken, type AccessPayload } from "@/lib/security/jwt";
import { Role } from "@prisma/client";

export const REFRESH_COOKIE = "refresh_token";

export function jsonError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export function requireAuth(req: Request): AccessPayload {
  const token = getBearerToken(req);
  if (!token) throw new AuthError("Unauthorized", 401);
  try {
    return verifyAccessToken(token);
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function requireRole(payload: AccessPayload, roles: Role[]) {
  if (!roles.includes(payload.role)) {
    throw new AuthError("Forbidden", 403);
  }
}

export function refreshCookieOptions(expiresAt: Date) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure,
    sameSite: "strict" as const,
    path: "/",
    expires: expiresAt,
  };
}
