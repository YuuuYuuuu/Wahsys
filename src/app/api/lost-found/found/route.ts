import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth } from "@/lib/http";
import {
  listFoundItems,
  createFoundReport,
  registerFoundItemDirectly,
} from "@/lib/services/lost-found.service";
import { createFoundReportSchema, registerFoundItemSchema } from "@/lib/validators/lost-found";
import { FoundItemStatus, Role } from "@prisma/client";

export const GET = withApi(async (req) => {
  const user = requireAuth(req);
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") as FoundItemStatus | null;
  const category = searchParams.get("category") || undefined;
  const location = searchParams.get("location") || undefined;
  const q = searchParams.get("q") || undefined;
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 16;

  const data = await listFoundItems({
    status: status || undefined,
    category,
    location,
    q,
    page,
    limit,
    userRole: user.role,
  });

  return NextResponse.json(data);
});

export const POST = withApi(async (req) => {
  const user = requireAuth(req);
  const body = await req.json();

  // Jika dipanggil dari form registrasi langsung oleh Admin/Petugas
  if (body.directRegister === true && (user.role === Role.ADMIN || user.role === Role.PETUGAS)) {
    const parsed = registerFoundItemSchema.parse(body);
    const item = await registerFoundItemDirectly(user.sub, parsed, req);
    return NextResponse.json(item, { status: 201 });
  }

  // Pelaporan barang temuan standar
  const parsed = createFoundReportSchema.parse(body);
  const result = await createFoundReport(user.sub, parsed, req);
  return NextResponse.json(result, { status: 201 });
});

