import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { loanRejectSchema } from "@/lib/validators/loan";
import * as loanService from "@/lib/services/loan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await ctx.params;
  const body = loanRejectSchema.parse(await req.json().catch(() => ({})));
  try {
    const out = await loanService.rejectPublicLoanRequest(p.sub, id, { reason: body.reason }, req);
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menolak";
    if (msg.includes("tidak ditemukan") || msg.includes("sudah diproses")) return jsonError(msg, 404);
    return jsonError(msg, 400);
  }
});
