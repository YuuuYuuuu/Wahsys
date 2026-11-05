import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole } from "@/lib/http";
import { Role } from "@prisma/client";
import * as smtpService from "@/lib/services/smtp-settings.service";
import { smtpPatchSchema } from "@/lib/validators/admin-settings";

export const GET = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const s = await smtpService.getSmtpSettings();
  return NextResponse.json(s);
});

export const PATCH = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const body = smtpPatchSchema.parse(await req.json());
  await smtpService.updateSmtpSettings(body);
  const s = await smtpService.getSmtpSettings();
  return NextResponse.json(s);
});
