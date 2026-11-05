import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { adminCreateUserSchema } from "@/lib/validators/user";
import * as userService from "@/lib/services/user.service";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  if (pageParam != null) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
    const pendingOnly = searchParams.get("pending") === "1";
    const result = await userService.listUsersPaginated(page, limit, { pendingOnly });
    return NextResponse.json(result);
  }
  const users = await userService.listUsers();
  return NextResponse.json(users);
});

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const body = adminCreateUserSchema.parse(await req.json());
  try {
    const user = await userService.adminCreateUser(p.sub, body, req);
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Email already registered") {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    throw e;
  }
});
