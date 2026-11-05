import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, jsonError } from "@/lib/http";
import { performanceReportReviewSchema } from "@/lib/validators/performance-report";
import * as performanceReportService from "@/lib/services/performance-report.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  const body = performanceReportReviewSchema.parse(await req.json());
  try {
    const row = await performanceReportService.reviewPerformanceReport(p.sub, id, body.reviewerNote, req);
    if (!row) return jsonError("Not found", 404);
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof Error && e.message === "Hanya laporan yang sudah diajukan yang dapat direview") {
      return jsonError(e.message, 400);
    }
    throw e;
  }
});
