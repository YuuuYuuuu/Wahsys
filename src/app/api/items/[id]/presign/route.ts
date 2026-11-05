import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { itemImagePresignSchema } from "@/lib/validators/item";
import { presignItemImagePut, isS3Configured } from "@/lib/services/s3.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  if (!isS3Configured()) {
    return jsonError("S3 belum dikonfigurasi — set variabel S3_* di .env", 503);
  }
  const { id } = await ctx.params;
  const body = itemImagePresignSchema.parse(await req.json());
  try {
    const out = await presignItemImagePut(id, body.filename, body.contentType);
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Presign gagal";
    return jsonError(msg, 400);
  }
});
