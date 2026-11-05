import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { overtimeRequestReviewSchema } from "@/lib/validators/overtime-request";
import * as overtimeRequestService from "@/lib/services/overtime-request.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = overtimeRequestReviewSchema.parse(await req.json());
  const row = await overtimeRequestService.reviewOvertimeRequest(id, p.sub, body.action, req);
  return NextResponse.json(row);
});
