import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import * as credentialService from "@/lib/services/credential.service";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get("page");
  if (pageParam != null) {
    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20) || 20));
    const result = await credentialService.listAuditLogsPaginated(page, limit);
    return NextResponse.json(result);
  }
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const logs = await credentialService.listAuditLogs(limit);
  return NextResponse.json(logs);
});
