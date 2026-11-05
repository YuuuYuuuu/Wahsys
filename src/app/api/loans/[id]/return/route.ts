import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { loanReturnSchema } from "@/lib/validators/loan";
import * as loanService from "@/lib/services/loan.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await ctx.params;
  const body = loanReturnSchema.parse(await req.json().catch(() => ({})));
  const returnDate = body.returnDate ? new Date(body.returnDate) : new Date();
  try {
    const loan = await loanService.returnLoan(p.sub, id, returnDate, req);
    return NextResponse.json(loan);
  } catch (e) {
    if (e instanceof Error && e.message === "Loan not found") return jsonError(e.message, 404);
    if (e instanceof Error && e.message === "Already returned") return jsonError(e.message, 400);
    throw e;
  }
});
