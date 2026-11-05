import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { createLostReport, listLostReports } from "@/lib/services/lost-found.service";
import { createLostReportSchema } from "@/lib/validators/lost-found";
import { LostReportStatus } from "@prisma/client";

export const GET = withApi(async (req) => {
  const user = requireAuth(req);
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") as LostReportStatus | null;
  const category = searchParams.get("category") || undefined;
  const q = searchParams.get("q") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 15;

  const data = await listLostReports({
    userId: user.sub,
    role: user.role,
    status: status || undefined,
    category,
    q,
    page,
    limit,
  });

  return NextResponse.json(data);
});

export const POST = withApi(async (req) => {
  const user = requireAuth(req);
  const body = await req.json();
  const parsed = createLostReportSchema.parse(body);

  const created = await createLostReport(user.sub, parsed, req);
  return NextResponse.json(created, { status: 201 });
});

