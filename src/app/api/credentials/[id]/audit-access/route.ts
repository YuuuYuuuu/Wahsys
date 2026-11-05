import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { logAudit } from "@/lib/audit/audit";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  await logAudit(p.sub, "CREDENTIAL_REVEAL", `credential:${id}`, {
    req,
    metadata: { credentialId: id },
  });
  return NextResponse.json({ ok: true });
});
