import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const MAX_ROWS = 5000;

function csvEscape(s: string): string {
  const t = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);

  const url = new URL(req.url);
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "2000", 10);
  const limit = Math.min(MAX_ROWS, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 2000));

  const rows = await prisma.item.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: { category: { select: { name: true } } },
  });

  const header = [
    "assetCode",
    "externalAssetCode",
    "externalQrValue",
    "name",
    "kind",
    "stock",
    "location",
    "condition",
    "category",
    "updatedAt",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.assetCode ?? ""),
        csvEscape(r.externalAssetCode ?? ""),
        csvEscape(r.externalQrValue ?? ""),
        csvEscape(r.name),
        csvEscape(r.kind),
        String(r.stock),
        csvEscape(r.location),
        csvEscape(r.condition),
        csvEscape(r.category.name),
        csvEscape(r.updatedAt.toISOString()),
      ].join(",")
    ),
  ];

  const body = lines.join("\n") + "\n";
  const filename = `wahsys-items-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
