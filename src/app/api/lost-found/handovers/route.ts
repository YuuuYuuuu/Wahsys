import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { listHandovers } from "@/lib/services/lost-found.service";
import { HandoverStatus } from "@prisma/client";

export const GET = withApi(async (req) => {
  const user = requireAuth(req);
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") as HandoverStatus | null;
  const q = searchParams.get("q") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 15;

  const data = await listHandovers({
    userId: user.sub,
    role: user.role,
    status: status || undefined,
    q,
    page,
    limit,
  });

  return NextResponse.json(data);
});

