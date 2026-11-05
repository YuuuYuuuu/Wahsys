import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import * as credentialService from "@/lib/services/credential.service";

const attachSchema = z.object({
  fileName: z.string().min(1),
  fileUrl: z.string().min(1).max(2000),
  fileType: z.string().min(1),
  fileSize: z.number().int().min(1).max(50 * 1024 * 1024),
  iv: z.string().optional().nullable(),
});

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = attachSchema.parse(await req.json());
  try {
    const row = await credentialService.attachCredentialFile(p.sub, id, body, req);
    return NextResponse.json(row, { status: 201 });
  } catch {
    return jsonError("Credential not found", 404);
  }
});
