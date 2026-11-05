import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators/auth";
import { loginUser } from "@/lib/services/auth.service";
import { withApi } from "@/lib/api-handler";
import { jsonError, refreshCookieOptions, REFRESH_COOKIE } from "@/lib/http";
import { loginRatelimit } from "@/lib/rate-limit";

export const POST = withApi(
  async (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rl = await loginRatelimit(ip);
    if (!rl.success) return jsonError("Too many login attempts", 429);

    const body = loginSchema.parse(await req.json());
    const result = await loginUser(body.email, body.password, req);
    if ("pendingApproval" in result && result.pendingApproval) {
      return jsonError("Akun belum disetujui administrator. Hubungi admin.", 403);
    }
    if ("failed" in result && result.failed) {
      return jsonError("Invalid email or password", 401);
    }
    if (!("accessToken" in result)) {
      return jsonError("Invalid email or password", 401);
    }
    const res = NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
    });
    res.cookies.set(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions(result.refreshExpiresAt));
    return res;
  },
  { rateLimit: false }
);
