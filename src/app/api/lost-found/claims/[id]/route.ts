import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { prisma } from "@/lib/db/prisma";
import { Role } from "@prisma/client";

export const GET = withApiRoute<{ id: string }>(async (req, { params }) => {
  const user = requireAuth(req);
  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { id },
    include: {
      claimant: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      foundItem: true,
      handover: true,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Klaim tidak ditemukan" }, { status: 404 });
  }

  // Jika bukan admin/petugas dan bukan pembuat klaim, tolak
  if (user.role !== Role.ADMIN && user.role !== Role.PETUGAS && claim.claimantId !== user.sub) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
  }

  return NextResponse.json(claim);
});

