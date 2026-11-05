import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, requireRole, jsonError } from "@/lib/http";
import { Role } from "@prisma/client";
import { smtpTestSchema } from "@/lib/validators/admin-settings";
import { sendMailSafe } from "@/lib/mail/mailer";
import { formatSmtpSendError } from "@/lib/mail/smtp-errors";

export const POST = withApi(async (req) => {
  const p = requireAuth(req);
  requireRole(p, [Role.ADMIN]);
  const body = smtpTestSchema.parse(await req.json());
  try {
    await sendMailSafe({
      to: body.to,
      subject: "WahSys — tes SMTP",
      html: "<p>Jika Anda menerima email ini, konfigurasi SMTP berfungsi.</p>",
    });
    return NextResponse.json({ ok: true, to: body.to });
  } catch (e) {
    return jsonError(formatSmtpSendError(e), 400);
  }
});
