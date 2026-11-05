import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { maintenanceCreateSchema } from "@/lib/validators/item";
import * as itemService from "@/lib/services/item.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await ctx.params;
  const body = maintenanceCreateSchema.parse(await req.json());
  const log = await itemService.addMaintenance(p.sub, id, body, req);
  return NextResponse.json(log, { status: 201 });
});
