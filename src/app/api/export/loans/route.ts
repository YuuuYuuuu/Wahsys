import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { LoanStatus, Role } from "@prisma/client";
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
  const statusRaw = url.searchParams.get("status")?.trim();
  const where =
    statusRaw && (Object.values(LoanStatus) as string[]).includes(statusRaw)
      ? { status: statusRaw as LoanStatus }
      : {};

  const rows = await prisma.loan.findMany({
    where,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      item: { select: { name: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const header = [
    "id",
    "status",
    "borrowerName",
    "borrowerEmail",
    "quantity",
    "itemName",
    "location",
    "loanDate",
    "dueDate",
    "returnDate",
    "internalUser",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.id),
        csvEscape(r.status),
        csvEscape(r.borrowerName),
        csvEscape(r.borrowerEmail ?? ""),
        String(r.quantity),
        csvEscape(r.item.name),
        csvEscape(r.location),
        csvEscape(r.loanDate.toISOString()),
        csvEscape(r.dueDate?.toISOString() ?? ""),
        csvEscape(r.returnDate?.toISOString() ?? ""),
        csvEscape(r.user ? `${r.user.name} <${r.user.email}>` : ""),
      ].join(",")
    ),
  ];

  const body = lines.join("\n") + "\n";
  const filename = `wahsys-loans-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
