import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, jsonError } from "@/lib/http";
import { performanceReportUpdateSchema } from "@/lib/validators/performance-report";
import * as performanceReportService from "@/lib/services/performance-report.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  const row = await performanceReportService.getPerformanceReport(p.sub, id);
  if (!row) return jsonError("Not found", 404);
  return NextResponse.json(row);
});

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  const { id } = await ctx.params;
  const body = performanceReportUpdateSchema.parse(await req.json());
  try {
    const row = await performanceReportService.updatePerformanceReport(p.sub, id, body, req);
    if (!row) return jsonError("Not found", 404);
    return NextResponse.json(row);
  } catch (e) {
    if (e instanceof Error) {
      if (
        e.message === "Hanya laporan draf yang dapat diubah" ||
        e.message === "Tanggal akhir tidak boleh sebelum tanggal mulai" ||
        e.message === "Laporan untuk periode ini sudah ada"
      ) {
        return jsonError(e.message, e.message.includes("sudah ada") ? 409 : 400);
      }
    }
    throw e;
  }
});
