import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { credentialEncryptedUploadFormSchema } from "@/lib/validators/credential";
import * as credentialService from "@/lib/services/credential.service";
import {
  writeLocalEncryptedCredentialBlob,
  CREDENTIAL_ENCRYPTED_MAX_BYTES,
} from "@/lib/services/credential-file-storage.service";

type Ctx = { params: Promise<{ id: string }> };

export const POST = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;

  const cred = await credentialService.getCredential(id);
  if (!cred) return jsonError("Credential not found", 404);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Body harus multipart/form-data", 400);
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("Field file wajib (ciphertext)", 400);
  }

  const rawName = form.get("fileName");
  const rawIv = form.get("iv");
  const rawMime = form.get("originalMime");
  const meta = credentialEncryptedUploadFormSchema.safeParse({
    fileName: typeof rawName === "string" ? rawName : "",
    iv: typeof rawIv === "string" ? rawIv : "",
    originalMime: typeof rawMime === "string" && rawMime.trim() ? rawMime.trim() : undefined,
  });
  if (!meta.success) {
    return jsonError("fileName / iv tidak valid", 400);
  }

  const storedMime = meta.data.originalMime?.trim() || "application/octet-stream";

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 1 || buf.length > CREDENTIAL_ENCRYPTED_MAX_BYTES) {
    return jsonError("Ukuran ciphertext tidak valid (maks. 50 MB)", 400);
  }

  let fileUrl: string;
  try {
    fileUrl = await writeLocalEncryptedCredentialBlob(id, buf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Gagal menyimpan file";
    return jsonError(msg, 400);
  }

  try {
    const row = await credentialService.attachCredentialFile(p.sub, id, {
      fileName: meta.data.fileName,
      fileUrl,
      fileType: storedMime,
      fileSize: buf.length,
      iv: meta.data.iv,
    }, req);
    return NextResponse.json(row, { status: 201 });
  } catch {
    return jsonError("Gagal menyimpan metadata file", 500);
  }
});
