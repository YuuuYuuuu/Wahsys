import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-handler";
import { jsonError } from "@/lib/http";
import * as itemService from "@/lib/services/item.service";

type Ctx = { params: Promise<{ identifier: string }> };

export const GET = withApiRoute(async (req, ctx: Ctx) => {
  void req;

  const { identifier } = await ctx.params;
  const item = await itemService.getItemByIdentifier(identifier);
  if (!item) return jsonError("Not found", 404);
  return NextResponse.json(item);
});
