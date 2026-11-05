import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/services/auth.service";
import { withApi } from "@/lib/api-handler";
import { REFRESH_COOKIE } from "@/lib/http";
import { cookies } from "next/headers";

export const POST = withApi(async (req: Request) => {
  void req;
  const jar = await cookies();
  const raw = jar.get(REFRESH_COOKIE)?.value;
  await logoutUser(raw);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(REFRESH_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  return res;
});
