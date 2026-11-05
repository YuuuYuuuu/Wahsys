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
    const loan = await loanService.confirmLoanByStaff(p.sub, id, req);
    return NextResponse.json(loan);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal mengonfirmasi";
    if (msg.includes("tidak ditemukan") || msg.includes("tidak menunggu")) return jsonError(msg, 404);
    if (msg.includes("Stok tidak mencukupi")) return jsonError(msg, 400);
    return jsonError(msg, 400);
  }
});
