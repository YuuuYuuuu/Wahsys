import { NextResponse } from "next/server";
import { refreshSession } from "@/lib/services/auth.service";
import { withApi } from "@/lib/api-handler";
import { jsonError, refreshCookieOptions, REFRESH_COOKIE } from "@/lib/http";
import { cookies } from "next/headers";

export const POST = withApi(async (req: Request) => {
  void req;
  const jar = await cookies();
  const raw = jar.get(REFRESH_COOKIE)?.value;
  if (!raw) return jsonError("No refresh token", 401);

  const result = await refreshSession(raw);
  if (!result) {
    const res = NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
    return res;
  }

  const res = NextResponse.json({
    user: result.user,
    accessToken: result.accessToken,
  });
  res.cookies.set(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt));
  return res;
});
