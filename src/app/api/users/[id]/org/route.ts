import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withApiRoute } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { userOrgUpdateSchema } from "@/lib/validators/user";
import * as userService from "@/lib/services/user.service";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withApiRoute(async (req, ctx: Ctx) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const { id } = await ctx.params;
  const body = userOrgUpdateSchema.parse(await req.json());
  try {
    const user = await userService.updateUserOrg(p.sub, id, body, req);
    return NextResponse.json(user);
  } catch (e) {
    if (e instanceof Error) {
      if (
        e.message === "Tidak dapat menunjuk diri sendiri sebagai supervisor" ||
        e.message === "Supervisor harus pengguna dengan peran Kepala Seksi"
      ) {
        return jsonError(e.message, 400);
      }
    }
    throw e;
  }
});
