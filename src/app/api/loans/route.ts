import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role, LoanStatus } from "@prisma/client";
import { loanCreateSchema } from "@/lib/validators/loan";
import * as loanService from "@/lib/services/loan.service";

export const GET = withApi(async (req) => {
  requireAuth(req);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as LoanStatus | null;
  const valid = status && Object.values(LoanStatus).includes(status) ? status : undefined;
  if (searchParams.has("page")) {
    const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitRaw) ? limitRaw : loanService.LOANS_PAGE_SIZE_DEFAULT;
    const result = await loanService.listLoansPaginated(
      valid,
      Number.isFinite(page) ? page : 1,
      Number.isFinite(limit) ? limit : loanService.LOANS_PAGE_SIZE_DEFAULT
    );
    return NextResponse.json(result);
  }
  const list = await loanService.listLoans(valid);
  return NextResponse.json(list);
});

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const body = loanCreateSchema.parse(await req.json());
  const loan = await loanService.createLoan(
    p.sub,
    {
      itemId: body.itemId,
      borrowerName: body.borrowerName,
      quantity: body.quantity,
      loanDate: new Date(body.loanDate),
      location: body.location,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    },
    req
  );
  return NextResponse.json(loan, { status: 201 });
});
