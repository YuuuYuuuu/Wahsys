import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit/audit";
import { Prisma, type ItemCondition, type ItemKind } from "@prisma/client";
import { randomBytes } from "crypto";

export const ITEMS_PAGE_SIZE_DEFAULT = 16;

export async function listItems() {
  return prisma.item.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });
}

export async function listItemsPaginated(page: number, pageSize: number = ITEMS_PAGE_SIZE_DEFAULT) {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const total = await prisma.item.count();
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * safeSize;
  const items = await prisma.item.findMany({
    skip,
    take: safeSize,
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });
  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export type ItemListFilters = {
  q?: string;
  kind?: ItemKind;
  categoryId?: string;
  condition?: ItemCondition;
  location?: string;
  /** Stok di bawah atau sama ambang (LOW_STOCK_THRESHOLD). */
  lowStock?: boolean;
};

function buildItemsWhere(filters: ItemListFilters): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {};
  const q = filters.q?.trim();

  if (q) {
    where.OR = [
      { name: { contains: q } },
      // assetCode nullable, tapi where tetap aman untuk contains
      { assetCode: { contains: q } },
      { externalAssetCode: { contains: q } },
      { externalQrValue: { contains: q } },
    ];
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.kind) where.kind = filters.kind;
  if (filters.condition) where.condition = filters.condition;

  if (filters.location?.trim()) {
    where.location = { contains: filters.location.trim() };
  }

  if (filters.lowStock) {
    const t = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);
    where.stock = { lte: Number.isFinite(t) ? t : 5 };
  }

  return where;
}

export async function listItemsFiltered(filters: ItemListFilters) {
  const where = buildItemsWhere(filters);
  return prisma.item.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });
}

export async function listItemsPaginatedFiltered(
  page: number,
  pageSize: number = ITEMS_PAGE_SIZE_DEFAULT,
  filters: ItemListFilters = {}
) {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const where = buildItemsWhere(filters);

  const total = await prisma.item.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * safeSize;

  const items = await prisma.item.findMany({
    where,
    skip,
    take: safeSize,
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function getItem(id: string) {
  return prisma.item.findUnique({
    where: { id },
    include: {
      category: true,
      conditionLogs: { orderBy: { changedAt: "desc" }, take: 50 },
      maintenanceLogs: { orderBy: { performedAt: "desc" }, take: 50 },
    },
  });
}

export async function createItem(
  userId: string,
  data: {
    name: string;
    kind?: ItemKind;
    categoryId: string;
    stock: number;
    location: string;
    condition?: ItemCondition;
    description?: string | null;
    imageUrl?: string | null;
    imageUrls?: string[];
    usesExternalIdentity?: boolean;
    externalAssetCode?: string | null;
    externalQrValue?: string | null;
    externalQrImageUrl?: string | null;
  },
  req: Request
) {
  const scannedAssetCode = data.externalAssetCode?.trim() || null;
  // Prioritaskan kode aset hasil scan kamera sebagai kode aset WahSys.
  // Jika tidak ada, fallback ke generator lama agar backward-compatible.
  const assetCode = scannedAssetCode || (await generateAssetCode());
  const item = await prisma.item.create({
    data: {
      assetCode,
      name: data.name,
      kind: data.kind ?? "NON_ASET",
      categoryId: data.categoryId,
      stock: data.stock,
      location: data.location,
      condition: data.condition ?? "BAIK",
      description: data.description ?? undefined,
      imageUrl: data.imageUrl ?? undefined,
      externalAssetCode: scannedAssetCode || undefined,
      externalQrValue: data.externalQrValue?.trim() || undefined,
      externalQrImageUrl: data.externalQrImageUrl ?? undefined,
    },
    include: { category: true },
  });
  await logAudit(userId, "ITEM_CREATE", `item:${item.id}`, { req });
  return item;
}

function formatAssetCodeCandidate() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rand = randomBytes(4).toString("hex").toUpperCase(); // 8 chars
  return `AS-${y}${m}${day}-${rand}`;
}

async function generateAssetCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const candidate = formatAssetCodeCandidate();
    const exists = await prisma.item.findUnique({ where: { assetCode: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error("Gagal membuat kode aset unik");
}

export async function getItemByIdentifier(identifier: string) {
  const id = identifier.trim();
  try {
    return await prisma.item.findFirst({
      where: {
        OR: [{ externalQrValue: id }, { externalAssetCode: id }, { assetCode: id }],
      },
      include: {
        category: true,
        conditionLogs: { orderBy: { changedAt: "desc" }, take: 50 },
        maintenanceLogs: { orderBy: { performedAt: "desc" }, take: 50 },
      },
    });
  } catch (e) {
    // Backward-compat: if dev server still uses an older Prisma client,
    // fall back to internal assetCode only instead of returning 500.
    if (e instanceof Prisma.PrismaClientValidationError && e.message.includes("externalQrValue")) {
      return prisma.item.findUnique({
        where: { assetCode: id },
        include: {
          category: true,
          conditionLogs: { orderBy: { changedAt: "desc" }, take: 50 },
          maintenanceLogs: { orderBy: { performedAt: "desc" }, take: 50 },
        },
      });
    }
    throw e;
  }
}

export async function updateItemByIdentifier(
  userId: string,
  identifier: string,
  data: Parameters<typeof updateItem>[2],
  req: Request
) {
  const id = identifier.trim();
  let existing: { id: string } | null = null;
  try {
    existing = await prisma.item.findFirst({
      where: { OR: [{ externalQrValue: id }, { externalAssetCode: id }, { assetCode: id }] },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError && e.message.includes("externalQrValue")) {
      existing = await prisma.item.findUnique({ where: { assetCode: id }, select: { id: true } });
    } else {
      throw e;
    }
  }
  if (!existing) return null;
  return updateItem(userId, existing.id, data, req);
}

export async function addMaintenanceByIdentifier(
  userId: string,
  identifier: string,
  data: { description: string; cost?: number | null },
  req: Request
) {
  const id = identifier.trim();
  let existing: { id: string } | null = null;
  try {
    existing = await prisma.item.findFirst({
      where: { OR: [{ externalQrValue: id }, { externalAssetCode: id }, { assetCode: id }] },
      select: { id: true },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError && e.message.includes("externalQrValue")) {
      existing = await prisma.item.findUnique({ where: { assetCode: id }, select: { id: true } });
    } else {
      throw e;
    }
  }
  if (!existing) return null;
  return addMaintenance(userId, existing.id, data, req);
}

export async function updateItem(
  userId: string,
  id: string,
  data: {
    name?: string;
    categoryId?: string;
    stock?: number;
    location?: string;
    condition?: ItemCondition;
    description?: string | null;
    conditionNote?: string;
    imageUrl?: string | null;
    imageUrls?: string[];
    usesExternalIdentity?: boolean;
    externalAssetCode?: string | null;
    externalQrValue?: string | null;
    externalQrImageUrl?: string | null;
  },
  req: Request
) {
  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return null;

  const { conditionNote, ...rest } = data;
  const nextCondition = data.condition ?? existing.condition;
  const stockChanged = rest.stock !== undefined && rest.stock !== existing.stock;
  const locationChanged = rest.location !== undefined && rest.location !== existing.location;
  const conditionChanged = data.condition !== undefined && data.condition !== existing.condition;

  const updateData: Prisma.ItemUpdateInput = {};
  if (rest.name !== undefined) updateData.name = rest.name;
  if (rest.categoryId !== undefined) updateData.category = { connect: { id: rest.categoryId } };
  if (rest.stock !== undefined) updateData.stock = rest.stock;
  if (rest.location !== undefined) updateData.location = rest.location;
  if (rest.condition !== undefined) updateData.condition = rest.condition;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.imageUrl !== undefined) updateData.imageUrl = rest.imageUrl;
  if (rest.imageUrls !== undefined) updateData.imageUrls = rest.imageUrls;
  if (rest.externalAssetCode !== undefined) updateData.externalAssetCode = rest.externalAssetCode?.trim() || null;
  if (rest.externalQrValue !== undefined) updateData.externalQrValue = rest.externalQrValue?.trim() || null;
  if (rest.externalQrImageUrl !== undefined) updateData.externalQrImageUrl = rest.externalQrImageUrl;

  await prisma.$transaction(async (tx) => {
    if (conditionChanged || stockChanged || locationChanged) {
      const noteParts: string[] = [];
      if (stockChanged) noteParts.push(`Stok: ${existing.stock} -> ${rest.stock}`);
      if (locationChanged) noteParts.push(`Lokasi: ${existing.location} -> ${rest.location}`);
      if (conditionNote?.trim()) noteParts.push(conditionNote.trim());
      await tx.itemConditionLog.create({
        data: {
          itemId: id,
          oldCondition: existing.condition,
          newCondition: nextCondition,
          note: noteParts.length ? noteParts.join(" | ") : conditionNote,
        },
      });
    }
    if (Object.keys(updateData).length > 0) {
      await tx.item.update({ where: { id }, data: updateData });
    }
  });

  const item = await prisma.item.findUnique({
    where: { id },
    include: { category: true },
  });
  await logAudit(userId, "ITEM_UPDATE", `item:${id}`, { req });
  return item;
}

export async function deleteItem(userId: string, id: string, req: Request) {
  await prisma.item.delete({ where: { id } });
  await logAudit(userId, "ITEM_DELETE", `item:${id}`, { req });
}

export async function addMaintenance(
  userId: string,
  itemId: string,
  data: { description: string; cost?: number | null },
  req: Request
) {
  const log = await prisma.maintenanceLog.create({
    data: {
      itemId,
      description: data.description,
      cost: data.cost ?? undefined,
    },
  });
  await logAudit(userId, "MAINTENANCE_CREATE", `item:${itemId}`, {
    req,
    metadata: { maintenanceId: log.id },
  });
  return log;
}
