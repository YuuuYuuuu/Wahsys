import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import { reminderDaysSchema } from "@/lib/validators/admin-settings";
import * as appSetting from "@/lib/services/app-setting.service";

const KEY = "reminder_days_before";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const value = await appSetting.getSetting(KEY, "1");
  return NextResponse.json({ daysBefore: parseInt(value, 10) || 1 });
});

export const PATCH = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const body = reminderDaysSchema.parse(await req.json());
  await appSetting.setSetting(KEY, String(body.daysBefore));
  return NextResponse.json({ ok: true, daysBefore: body.daysBefore });
});
