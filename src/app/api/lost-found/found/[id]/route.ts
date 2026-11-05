import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { getFoundItemById, updateFoundItem } from "@/lib/services/lost-found.service";
import { updateFoundItemSchema } from "@/lib/validators/lost-found";
import { Role } from "@prisma/client";

export const GET = withApiRoute<{ id: string }>(async (req, { params }) => {
  const user = requireAuth(req);
  const { id } = await params;
  const item = await getFoundItemById(id, user.role);
  return NextResponse.json(item);
});

export const PATCH = withApiRoute<{ id: string }>(async (req, { params }) => {
  const user = requireAuth(req);
  requireRole(user, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await params;
  const body = await req.json();
  const parsed = updateFoundItemSchema.parse(body);

  const updated = await updateFoundItem(id, user.sub, parsed, req);
  return NextResponse.json(updated);
});

