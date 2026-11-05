import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { categoryCreateSchema } from "@/lib/validators/category";
import * as categoryService from "@/lib/services/category.service";

export const GET = withApi(async (req) => {
  requireAuth(req);
  const list = await categoryService.listCategories();
  return NextResponse.json(list);
});

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const body = categoryCreateSchema.parse(await req.json());
  const cat = await categoryService.createCategory(p.sub, body.name, req, body.loanPolicy);
  return NextResponse.json(cat, { status: 201 });
});
