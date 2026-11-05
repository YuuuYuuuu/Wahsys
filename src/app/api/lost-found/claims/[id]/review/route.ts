import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { reviewClaim } from "@/lib/services/lost-found.service";
import { reviewClaimSchema } from "@/lib/validators/lost-found";
import { Role } from "@prisma/client";

export const POST = withApiRoute<{ id: string }>(async (req, { params }) => {
  const user = requireAuth(req);
  requireRole(user, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await params;
  const body = await req.json();
  const parsed = reviewClaimSchema.parse(body);

  const updated = await reviewClaim(id, user.sub, parsed, req);
  return NextResponse.json(updated);
});

