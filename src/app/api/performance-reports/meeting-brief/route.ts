import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { meetingBriefQuerySchema } from "@/lib/validators/performance-report";
import * as performanceReportService from "@/lib/services/performance-report.service";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  const url = new URL(req.url);
  const parsed = meetingBriefQuerySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 400 });
  }
  const brief = await performanceReportService.getMeetingBrief(p.sub, parsed.data.from, parsed.data.to);
  return NextResponse.json(brief);
});
