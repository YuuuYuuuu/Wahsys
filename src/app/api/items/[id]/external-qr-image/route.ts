import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import * as itemService from "@/lib/services/item.service";
import { storeItemImage } from "@/lib/services/item-image-storage.service";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const { id } = await ctx.params;

  const existing = await itemService.getItem(id);
  if (!existing) return jsonError("Not found", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Body harus multipart/form-data dengan field file", 400);
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("Field file wajib", 400);
  }
  if (!ALLOWED.has(file.type)) {
    return jsonError("Hanya JPEG, PNG, atau WebP", 400);
  }
  if (file.size > MAX_BYTES) {
    return jsonError("Ukuran maks. 5 MB", 400);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let externalQrImageUrl: string;
  try {
    externalQrImageUrl = await storeItemImage(id, `external-qr-${file.name}`, file.type, buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unggah gagal";
    return jsonError(msg, 400);
  }

  const item = await itemService.updateItem(p.sub, id, { externalQrImageUrl }, req);
  if (!item) return jsonError("Not found", 404);
  return NextResponse.json(item);
});
