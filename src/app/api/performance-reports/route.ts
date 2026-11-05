import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, jsonError } from "@/lib/http";
import {
  performanceReportCreateSchema,
  performanceReportListQuerySchema,
} from "@/lib/validators/performance-report";
import * as performanceReportService from "@/lib/services/performance-report.service";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  const url = new URL(req.url);
  const parsed = performanceReportListQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    unit: url.searchParams.get("unit") ?? undefined,
    authorId: url.searchParams.get("authorId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }
  const result = await performanceReportService.listPerformanceReports(p.sub, parsed.data);
  return NextResponse.json(result);
});

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  const body = performanceReportCreateSchema.parse(await req.json());
  try {
    const row = await performanceReportService.createPerformanceReport(p.sub, body, req);
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "Laporan untuk periode ini sudah ada") {
      return jsonError(e.message, 409);
    }
    throw e;
  }
});
