import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import * as loanService from "@/lib/services/loan.service";

function base() {
  const u = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return u.replace(/\/$/, "");
}

export const GET = withApi(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.redirect(`${base()}/pinjam/gagal?alasan=token`);
  }
  const result = await loanService.confirmPublicLoan(token, req);
  if (!result.ok) {
    const q =
      result.reason === "expired" ? "kedaluwarsa" : result.reason === "stock" ? "stok" : "invalid";
    return NextResponse.redirect(`${base()}/pinjam/gagal?alasan=${q}`);
  }
  return NextResponse.redirect(`${base()}/pinjam/berhasil`);
});
