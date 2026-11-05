import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";

export const POST = withApi(async (req) => {
  requireAuth(req);
  const res = NextResponse.json({ ok: true, expiresInSeconds: 3600 });
  res.cookies.set("scan_session", "1", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  return res;
});

