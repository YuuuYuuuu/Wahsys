import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { overtimeRequestCreateSchema, overtimeRequestListQuerySchema } from "@/lib/validators/overtime-request";
import * as overtimeRequestService from "@/lib/services/overtime-request.service";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  const url = new URL(req.url);
  const parsed = overtimeRequestListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }
  const q = parsed.data;
  const result = await overtimeRequestService.listOvertimeRequests(
    p.sub,
    p.role,
    q.page,
    q.limit,
    q.status
  );
  return NextResponse.json(result);
});

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  const body = overtimeRequestCreateSchema.parse(await req.json());
  const row = await overtimeRequestService.createOvertimeRequest(
    p.sub,
    body.formSnapshot,
    body.asDraft === true,
    req
  );
  return NextResponse.json(row, { status: 201 });
});
