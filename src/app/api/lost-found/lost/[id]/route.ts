import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { getLostReportById, updateLostReportStatus } from "@/lib/services/lost-found.service";
import { updateLostReportStatusSchema } from "@/lib/validators/lost-found";

export const GET = withApiRoute<{ id: string }>(async (req, { params }) => {
  requireAuth(req);
  const { id } = await params;
  const item = await getLostReportById(id);
  return NextResponse.json(item);
});

export const PATCH = withApiRoute<{ id: string }>(async (req, { params }) => {
  const user = requireAuth(req);
  const { id } = await params;
  const body = await req.json();
  const parsed = updateLostReportStatusSchema.parse(body);

  const updated = await updateLostReportStatus(id, user.sub, user.role, parsed, req);
  return NextResponse.json(updated);
});

