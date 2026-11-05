import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { categoryUpdateSchema } from "@/lib/validators/category";
import * as categoryService from "@/lib/services/category.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = categoryUpdateSchema.parse(await req.json());
  const cat = await categoryService.updateCategory(
    p.sub,
    id,
    { name: body.name, loanPolicy: body.loanPolicy },
    req
  );
  return NextResponse.json(cat);
});

export const DELETE = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await ctx.params;
  await categoryService.deleteCategory(p.sub, id, req);
  return NextResponse.json({ ok: true });
});
