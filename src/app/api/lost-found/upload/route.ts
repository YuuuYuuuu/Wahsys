import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import { storeLostFoundImage } from "@/lib/services/lost-found-storage.service";

export const POST = withApi(async (req) => {
  requireAuth(req);

  const formData = await req.formData();
  const file = formData.get("file");
  const subfolder = (formData.get("folder") as string) || "general";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 5 MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const url = await storeLostFoundImage(subfolder, file.name, file.type, buffer);

  return NextResponse.json({ url });
});

