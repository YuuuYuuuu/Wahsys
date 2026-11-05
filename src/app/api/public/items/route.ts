import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import * as loanService from "@/lib/services/loan.service";

export const GET = withApi(async (req) => {
  void req;
  const items = await loanService.listPublicItems();
  return NextResponse.json(items);
});
