import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type Ctx = { params: Promise<{ id: string }> };

function csvEscape(val: unknown): string {
  if (val == null) return "";
  const s = String(val).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const GET = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);

  const { id } = await ctx.params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      category: { select: { name: true } },
      conditionLogs: { orderBy: { changedAt: "desc" } },
      maintenanceLogs: { orderBy: { performedAt: "desc" } },
    },
  });

  if (!item) {
    return jsonError("Barang tidak ditemukan", 404);
  }

  const lines: string[] = [];

  // 1. INFORMASI UMUM BARANG
  lines.push("=== INFORMASI BARANG ===");
  lines.push(
    [
      "ID",
      "Kode Aset WahSys",
      "Kode Aset Lembaga",
      "QR Lembaga / Label",
      "Nama Barang",
      "Jenis",
      "Kategori",
      "Stok",
      "Lokasi",
      "Kondisi Saat Ini",
      "Deskripsi",
      "Tanggal Dibuat",
      "Terakhir Diperbarui",
    ].map(csvEscape).join(",")
  );
  lines.push(
    [
      item.id,
      item.assetCode ?? "",
      item.externalAssetCode ?? "",
      item.externalQrValue ?? "",
      item.name,
      item.kind === "ASET" ? "Aset" : "Non Aset",
      item.category.name,
      item.stock,
      item.location,
      item.condition,
      item.description ?? "",
      item.createdAt.toISOString(),
      item.updatedAt.toISOString(),
    ].map(csvEscape).join(",")
  );
  lines.push("");

  // 2. RIWAYAT KONDISI
  lines.push("=== RIWAYAT KONDISI ===");
  lines.push(["No", "Waktu Perubahan", "Kondisi Lama", "Kondisi Baru", "Catatan"].map(csvEscape).join(","));
  if (item.conditionLogs.length === 0) {
    lines.push("-,Belum ada catatan riwayat kondisi,-,-,-");
  } else {
    item.conditionLogs.forEach((log, idx) => {
      lines.push(
        [
          idx + 1,
          log.changedAt.toISOString(),
          log.oldCondition,
          log.newCondition,
          log.note ?? "",
        ].map(csvEscape).join(",")
      );
    });
  }
  lines.push("");

  // 3. RIWAYAT PERAWATAN & BIAYA
  lines.push("=== RIWAYAT PERAWATAN & BIAYA ===");
  lines.push(["No", "Tanggal Perawatan", "Deskripsi Perawatan", "Biaya (IDR)"].map(csvEscape).join(","));
  let totalCost = 0;
  if (item.maintenanceLogs.length === 0) {
    lines.push("-,Belum ada catatan perawatan,-,-");
  } else {
    item.maintenanceLogs.forEach((m, idx) => {
      const cost = m.cost ?? 0;
      totalCost += cost;
      lines.push(
        [
          idx + 1,
          m.performedAt.toISOString(),
          m.description,
          cost,
        ].map(csvEscape).join(",")
      );
    });
  }
  lines.push("");
  lines.push(["RINGKASAN", "Total Biaya Perawatan", "", totalCost].map(csvEscape).join(","));

  const csvBody = "\uFEFF" + lines.join("\n") + "\n"; // Include UTF-8 BOM for Microsoft Excel compatibility
  const safeCode = (item.assetCode || item.externalAssetCode || item.id).replace(/[^a-zA-Z0-9-_]/g, "_");
  const filename = `wahsys-item-${safeCode}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
