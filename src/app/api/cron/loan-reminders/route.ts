import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { jsonError } from "@/lib/http";
import * as loanService from "@/lib/services/loan.service";

export const POST = withApi(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return jsonError("CRON_SECRET tidak diset", 503);
  }
  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== secret) {
    return jsonError("Unauthorized", 401);
  }
  const out = await loanService.sendDueReminders();
  return NextResponse.json(out);
});
