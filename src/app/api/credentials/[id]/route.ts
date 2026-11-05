import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { credentialUpdateSchema } from "@/lib/validators/credential";
import * as credentialService from "@/lib/services/credential.service";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const cred = await credentialService.getCredential(id);
  if (!cred) return jsonError("Not found", 404);
  return NextResponse.json(cred);
});

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = credentialUpdateSchema.parse(await req.json());
  try {
    const cred = await credentialService.updateCredential(p.sub, id, body, req);
    return NextResponse.json(cred);
  } catch {
    return jsonError("Not found", 404);
  }
});

export const DELETE = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  try {
    await credentialService.deleteCredential(p.sub, id, req);
    return NextResponse.json({ ok: true });
  } catch {
    return jsonError("Not found", 404);
  }
});
