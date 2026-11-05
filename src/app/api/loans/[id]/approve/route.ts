import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import * as loanService from "@/lib/services/loan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await ctx.params;
  try {
    const out = await loanService.approvePublicLoanRequest(p.sub, id, req);
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyetujui";
    if (msg.includes("tidak ditemukan") || msg.includes("sudah diproses")) return jsonError(msg, 404);
    if (msg.includes("Stok tidak mencukupi")) return jsonError(msg, 400);
    if (msg.includes("Template email") || msg.includes("SMTP") || msg.includes("email persetujuan")) {
      return jsonError(msg, 503);
    }
    return jsonError(msg, 400);
  }
});
