import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function csvEscape(s: unknown): string {
  if (s == null) return "";
  const t = String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "found";

  if (type === "lost") {
    const rows = await prisma.lostReport.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    });

    const header = [
      "ticketNumber",
      "itemName",
      "category",
      "description",
      "lastLocation",
      "lostDate",
      "status",
      "reporterName",
      "reporterEmail",
      "createdAt",
    ];

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.ticketNumber),
          csvEscape(r.itemName),
          csvEscape(r.category),
          csvEscape(r.description),
          csvEscape(r.lastLocation),
          csvEscape(r.lostDate?.toISOString()),
          csvEscape(r.status),
          csvEscape(r.user?.name),
          csvEscape(r.user?.email),
          csvEscape(r.createdAt?.toISOString()),
        ].join(",")
      );
    }

    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="lost_reports.csv"',
      },
    });
  }

  if (type === "claims") {
    const rows = await prisma.claim.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: {
        claimant: { select: { name: true, email: true } },
        foundItem: { select: { itemCode: true, itemName: true } },
      },
    });

    const header = [
      "claimNumber",
      "itemCode",
      "itemName",
      "claimantName",
      "claimantEmail",
      "ownershipDescription",
      "status",
      "createdAt",
    ];

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.claimNumber),
          csvEscape(r.foundItem?.itemCode),
          csvEscape(r.foundItem?.itemName),
          csvEscape(r.claimant?.name),
          csvEscape(r.claimant?.email),
          csvEscape(r.ownershipDescription),
          csvEscape(r.status),
          csvEscape(r.createdAt?.toISOString()),
        ].join(",")
      );
    }

    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="claims.csv"',
      },
    });
  }

  if (type === "handovers") {
    const rows = await prisma.handover.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: {
        recipient: { select: { name: true, email: true } },
        admin: { select: { name: true, email: true } },
        claim: { include: { foundItem: { select: { itemCode: true, itemName: true } } } },
      },
    });

    const header = [
      "handoverNumber",
      "itemCode",
      "itemName",
      "recipientName",
      "recipientEmail",
      "adminName",
      "scheduledAt",
      "handoverAt",
      "status",
      "pickupLocation",
      "notes",
    ];

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.handoverNumber),
          csvEscape(r.claim?.foundItem?.itemCode),
          csvEscape(r.claim?.foundItem?.itemName),
          csvEscape(r.recipient?.name),
          csvEscape(r.recipient?.email),
          csvEscape(r.admin?.name),
          csvEscape(r.scheduledAt?.toISOString()),
          csvEscape(r.handoverAt?.toISOString()),
          csvEscape(r.status),
          csvEscape(r.pickupLocation),
          csvEscape(r.notes),
        ].join(",")
      );
    }

    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="handovers.csv"',
      },
    });
  }

  // Default: found items
  const rows = await prisma.foundItem.findMany({
    take: 2000,
    orderBy: { createdAt: "desc" },
    include: { receivedBy: { select: { name: true, email: true } } },
  });

  const header = [
    "itemCode",
    "itemName",
    "category",
    "publicDescription",
    "foundLocation",
    "foundDate",
    "storageLocation",
    "condition",
    "status",
    "receivedBy",
    "createdAt",
    "returnedAt",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.itemCode),
        csvEscape(r.itemName),
        csvEscape(r.category),
        csvEscape(r.publicDescription),
        csvEscape(r.foundLocation),
        csvEscape(r.foundDate?.toISOString()),
        csvEscape(r.storageLocation),
        csvEscape(r.condition),
        csvEscape(r.status),
        csvEscape(r.receivedBy?.name),
        csvEscape(r.createdAt?.toISOString()),
        csvEscape(r.returnedAt?.toISOString()),
      ].join(",")
    );
  }

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="found_items.csv"',
    },
  });
});

