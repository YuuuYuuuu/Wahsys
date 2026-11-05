import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";

export const GET = withApi(async (req) => {
  const payload = requireAuth(req);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      orgRole: true,
      unit: true,
      supervisorId: true,
      accountApproved: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!user.accountApproved) {
    return NextResponse.json({ error: "Akun belum disetujui" }, { status: 403 });
  }
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    orgRole: user.orgRole,
    unit: user.unit,
    supervisorId: user.supervisorId,
  });
});
