import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { presignSchema } from "@/lib/validators/credential";
import * as credentialService from "@/lib/services/credential.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = presignSchema.parse(await req.json());
  try {
    const out = await credentialService.presignCredentialFile(
      p.sub,
      id,
      body.fileName,
      body.fileType,
      body.fileSize,
      req
    );
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof Error && e.message === "Credential not found") return jsonError(e.message, 404);
    if (e instanceof Error && e.message.includes("S3")) return jsonError(e.message, 503);
    throw e;
  }
});
