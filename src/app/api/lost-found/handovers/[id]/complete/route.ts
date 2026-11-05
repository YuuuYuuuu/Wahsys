import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { completeHandover } from "@/lib/services/lost-found.service";
import { completeHandoverSchema } from "@/lib/validators/lost-found";
import { Role } from "@prisma/client";

export const POST = withApiRoute<{ id: string }>(async (req, { params }) => {
  const user = requireAuth(req);
  requireRole(user, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await params;
  const body = await req.json();
  const parsed = completeHandoverSchema.parse(body);

  const completed = await completeHandover(id, user.sub, parsed, req);
  return NextResponse.json(completed);
});

