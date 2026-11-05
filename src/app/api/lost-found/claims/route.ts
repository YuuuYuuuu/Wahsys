import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { listClaims, submitClaim } from "@/lib/services/lost-found.service";
import { submitClaimSchema } from "@/lib/validators/lost-found";
import { ClaimStatus } from "@prisma/client";

export const GET = withApi(async (req) => {
  const user = requireAuth(req);
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") as ClaimStatus | null;
  const foundItemId = searchParams.get("foundItemId") || undefined;
  const q = searchParams.get("q") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 15;

  const data = await listClaims({
    userId: user.sub,
    role: user.role,
    status: status || undefined,
    foundItemId,
    q,
    page,
    limit,
  });

  return NextResponse.json(data);
});

export const POST = withApi(async (req) => {
  const user = requireAuth(req);
  const body = await req.json();
  const parsed = submitClaimSchema.parse(body);

  const claim = await submitClaim(user.sub, parsed, req);
  return NextResponse.json(claim, { status: 201 });
});

