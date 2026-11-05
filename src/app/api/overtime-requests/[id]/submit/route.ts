import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import * as overtimeRequestService from "@/lib/services/overtime-request.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  const row = await overtimeRequestService.submitOvertimeRequest(id, p.sub, req);
  return NextResponse.json(row);
});
