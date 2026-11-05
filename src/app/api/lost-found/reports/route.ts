import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { getOperationalReports } from "@/lib/services/lost-found.service";
import { Role } from "@prisma/client";

export const GET = withApi(async (req) => {
  const user = requireAuth(req);
  requireRole(user, [Role.ADMIN, Role.PETUGAS]);
  const data = await getOperationalReports();
  return NextResponse.json(data);
});

