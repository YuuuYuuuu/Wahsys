import { NextResponse } from "next/server";
import { withApi } from "@/lib/api-handler";
import { requireAuth, jsonError } from "@/lib/http";
import { overtimeSendSchema } from "@/lib/validators/overtime";
import { formatSmtpSendError } from "@/lib/mail/smtp-errors";
import { sendMailSafe, sendMailWithAttachmentsSafe } from "@/lib/mail/mailer";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const POST = withApi(async (req) => {
  requireAuth(req);
  const body = overtimeSendSchema.parse(await req.json());

  const messageHtml = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5">
  <p style="margin:0 0 12px 0">Yth. Bapak/Ibu,</p>
  <pre style="white-space:pre-wrap;margin:0 0 16px 0;background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px">${escapeHtml(
    body.messageText
  )}</pre>
  ${body.letterHtml ? `<div style="margin-top:18px">${body.letterHtml}</div>` : ""}
</div>`;

  try {
    if (body.pdfBase64) {
      await sendMailWithAttachmentsSafe({
        to: body.to,
        subject: body.subject,
        html: messageHtml,
        attachments: [{ filename: "surat-lembur.pdf", contentBase64: body.pdfBase64, contentType: "application/pdf" }],
      });
    } else {
      await sendMailSafe({ to: body.to, subject: body.subject, html: messageHtml });
    }
  } catch (e) {
    return jsonError(formatSmtpSendError(e), 502);
  }

  return NextResponse.json({ ok: true });
});

