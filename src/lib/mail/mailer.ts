import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { prisma } from "@/lib/db/prisma";
import { decryptSecret } from "@/lib/mail/settings-crypto";
import { normalizeSmtpHost } from "@/lib/mail/smtp-host";
import { logger } from "@/lib/logger";

export type MailAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string;
};

export async function getTransporter() {
  const row = await prisma.smtpSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row || !row.host || !row.authUser) {
    throw new Error("SMTP belum dikonfigurasi (host / user kosong)");
  }
  const host = normalizeSmtpHost(row.host);
  if (!host) {
    throw new Error("Host SMTP kosong atau tidak valid");
  }
  const pass = row.authPassword ? decryptSecret(row.authPassword) : "";
  if (!pass) {
    throw new Error("Password SMTP belum disimpan — isi App Password lalu klik Simpan SMTP.");
  }

  const port = row.port;
  let secure = Boolean(row.secure);
  if (port === 465) {
    secure = true;
  } else if (port === 587) {
    secure = false;
  }

  const opts: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: { user: row.authUser.trim(), pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  };
  if (!secure && port === 587) {
    opts.requireTLS = true;
  }

  return nodemailer.createTransport(opts);
}

export async function sendMailSafe(options: { to: string; subject: string; html: string }) {
  const row = await prisma.smtpSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row?.fromEmail) throw new Error("SMTP fromEmail kosong");
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: row.fromName ? `"${row.fromName}" <${row.fromEmail}>` : row.fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  logger.info({ to: options.to }, "mail sent");
}

export async function sendMailWithAttachmentsSafe(options: {
  to: string;
  subject: string;
  html: string;
  attachments: MailAttachment[];
}) {
  const row = await prisma.smtpSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row?.fromEmail) throw new Error("SMTP fromEmail kosong");
  const transporter = await getTransporter();
  await transporter.sendMail({
    from: row.fromName ? `"${row.fromName}" <${row.fromEmail}>` : row.fromEmail,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments.map((a) => ({
      filename: a.filename,
      content: a.contentBase64,
      encoding: "base64",
      contentType: a.contentType,
    })),
  });
  logger.info({ to: options.to, attachments: options.attachments.map((x) => x.filename) }, "mail sent (attachments)");
}
