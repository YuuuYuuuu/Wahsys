import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { getLostFoundDashboardStats } from "@/lib/services/lost-found.service";

export const GET = withApi(async (req) => {
  requireAuth(req);
  const data = await getLostFoundDashboardStats();
  return NextResponse.json(data);
});

