import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { roleUpdateSchema } from "@/lib/validators/user";
import * as userService from "@/lib/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = roleUpdateSchema.parse(await req.json());
  try {
    const user = await userService.updateUserRole(p.sub, id, body.role, req);
    return NextResponse.json(user);
  } catch {
    return jsonError("Not found", 404);
  }
});
