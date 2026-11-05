import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { overtimeRequestUpdateSchema } from "@/lib/validators/overtime-request";
import * as overtimeRequestService from "@/lib/services/overtime-request.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  const row = await overtimeRequestService.getOvertimeRequest(id, p.sub, p.role);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
});

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  const body = overtimeRequestUpdateSchema.parse(await req.json());
  const row = await overtimeRequestService.updateOvertimeRequestDraft(id, p.sub, body.formSnapshot, req);
  return NextResponse.json(row);
});

export const DELETE = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  await overtimeRequestService.deleteOvertimeRequestDraft(id, p.sub, req);
  return NextResponse.json({ ok: true });
});
