import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { ItemCondition, ItemKind, Role } from "@prisma/client";
import { itemCreateSchema } from "@/lib/validators/item";
import * as itemService from "@/lib/services/item.service";

export const GET = withApi(async (req) => {
  requireAuth(req);
  const url = new URL(req.url);
  if (url.searchParams.has("page")) {
    const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
    const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitRaw) ? limitRaw : itemService.ITEMS_PAGE_SIZE_DEFAULT;

    const q = url.searchParams.get("q")?.trim() || undefined;
    const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
    const kindRaw = url.searchParams.get("kind")?.trim() || undefined;
    const conditionRaw = url.searchParams.get("condition")?.trim() || undefined;
    const location = url.searchParams.get("location")?.trim() || undefined;
    const lowStockRaw = url.searchParams.get("lowStock")?.trim();
    const lowStock = lowStockRaw === "1" || lowStockRaw === "true";

    const kind: ItemKind | undefined =
      kindRaw === "ASET" || kindRaw === "NON_ASET" ? (kindRaw as ItemKind) : undefined;
    const condition: ItemCondition | undefined =
      conditionRaw === "BAIK" ||
      conditionRaw === "PERLU_PERBAIKAN" ||
      conditionRaw === "RUSAK"
        ? (conditionRaw as ItemCondition)
        : undefined;

    const result = await itemService.listItemsPaginated(
      Number.isFinite(page) ? page : 1,
      Number.isFinite(limit) ? limit : itemService.ITEMS_PAGE_SIZE_DEFAULT
    );
    // Apply filtering (additive), but only when filter params are provided.
    const hasFilters = Boolean(q || categoryId || kind || condition || location || lowStock);
    if (hasFilters) {
      return NextResponse.json(
        await itemService.listItemsPaginatedFiltered(Number.isFinite(page) ? page : 1, Number.isFinite(limit) ? limit : itemService.ITEMS_PAGE_SIZE_DEFAULT, {
          q,
          kind,
          categoryId,
          condition,
          location,
          lowStock: lowStock || undefined,
        }),
      );
    }
    return NextResponse.json(result);
  }

  const q = url.searchParams.get("q")?.trim() || undefined;
  const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
  const kindRaw = url.searchParams.get("kind")?.trim() || undefined;
  const conditionRaw = url.searchParams.get("condition")?.trim() || undefined;
  const location = url.searchParams.get("location")?.trim() || undefined;
  const lowStockRaw = url.searchParams.get("lowStock")?.trim();
  const lowStock = lowStockRaw === "1" || lowStockRaw === "true";

  const kind: ItemKind | undefined =
    kindRaw === "ASET" || kindRaw === "NON_ASET" ? (kindRaw as ItemKind) : undefined;
  const condition: ItemCondition | undefined =
    conditionRaw === "BAIK" || conditionRaw === "PERLU_PERBAIKAN" || conditionRaw === "RUSAK"
      ? (conditionRaw as ItemCondition)
      : undefined;

  const hasFilters = Boolean(q || categoryId || kind || condition || location || lowStock);
  const list = hasFilters
    ? await itemService.listItemsFiltered({ q, kind, categoryId, condition, location, lowStock: lowStock || undefined })
    : await itemService.listItems();
  return NextResponse.json(list);
});

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN, Role.PETUGAS]);
  const body = itemCreateSchema.parse(await req.json());
  const item = await itemService.createItem(p.sub, body, req);
  return NextResponse.json(item, { status: 201 });
});
