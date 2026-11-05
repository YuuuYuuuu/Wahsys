import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { emailTemplatePatchSchema } from "@/lib/validators/admin-settings";
import * as tplService from "@/lib/services/email-template.service";

type Ctx = { params: Promise<{ key: string }> };

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { key } = await ctx.params;
  const body = emailTemplatePatchSchema.parse(await req.json());
  try {
    const row = await tplService.updateEmailTemplate(decodeURIComponent(key), body);
    return NextResponse.json(row);
  } catch {
    return jsonError("Template tidak ditemukan", 404);
  }
});
