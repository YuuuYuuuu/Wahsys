import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { jsonError } from "@/lib/http";
import { publicLoanRequestSchema } from "@/lib/validators/loan";
import { publicLoanRatelimit } from "@/lib/rate-limit";
import * as loanService from "@/lib/services/loan.service";

export const POST = withApi(
  async (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rl = await publicLoanRatelimit(ip);
    if (!rl.success) {
      return jsonError("Terlalu banyak permintaan. Coba lagi nanti.", 429);
    }
    const body = publicLoanRequestSchema.parse(await req.json());
    const result = await loanService.createPublicLoanRequest(
      {
        itemId: body.itemId,
        borrowerName: body.borrowerName,
        borrowerEmail: body.borrowerEmail,
        borrowerPhone: body.borrowerPhone,
        quantity: body.quantity,
        dueDate: new Date(body.dueDate),
        location: body.location ?? "",
      },
      req
    );
    return NextResponse.json(result, {
      status: result.outcome === "pending_approval" ? 201 : 200,
    });
  },
  { rateLimit: false }
);
