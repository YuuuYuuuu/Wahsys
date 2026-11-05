import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import * as userService from "@/lib/services/user.service";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const rows = await userService.listKepalaSeksi();
  return NextResponse.json(rows);
});
