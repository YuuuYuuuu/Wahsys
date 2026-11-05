import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import * as userService from "@/lib/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  if (id === p.sub) {
    return jsonError("Tidak perlu menyetujui diri sendiri", 400);
  }
  try {
    const user = await userService.approveUser(p.sub, id, req);
    return NextResponse.json(user);
  } catch {
    return jsonError("Not found", 404);
  }
});
