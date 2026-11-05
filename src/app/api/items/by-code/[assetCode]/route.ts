import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { itemUpdateSchema } from "@/lib/validators/item";
import * as itemService from "@/lib/services/item.service";

type Ctx = { params: Promise<{ assetCode: string }> };

export const GET = withApiRoute(async (req, ctx: Ctx) => {
  requireAuth(req);

  const { assetCode } = await ctx.params;
  const item = await itemService.getItemByIdentifier(assetCode);
  if (!item) return jsonError("Not found", 404);
  return NextResponse.json(item);
});

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);

  const { assetCode } = await ctx.params;
  const body = itemUpdateSchema.parse(await req.json());
  const item = await itemService.updateItemByIdentifier(p.sub, assetCode, body, req);
  if (!item) return jsonError("Not found", 404);
  return NextResponse.json(item);
});

