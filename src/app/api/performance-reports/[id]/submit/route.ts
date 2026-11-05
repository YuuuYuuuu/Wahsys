import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, jsonError } from "@/lib/http";
import * as performanceReportService from "@/lib/services/performance-report.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  try {
    const row = await performanceReportService.submitPerformanceReport(p.sub, id, req);
    if (!row) return jsonError("Not found", 404);
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof Error && e.message === "Hanya laporan draf yang dapat diajukan") {
      return jsonError(e.message, 400);
    }
    throw e;
  }
});
