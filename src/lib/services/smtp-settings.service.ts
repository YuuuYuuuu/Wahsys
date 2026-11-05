import { prisma } from "@/lib/db/prisma";
import { encryptSecret } from "@/lib/mail/settings-crypto";
import { normalizeSmtpHost } from "@/lib/mail/smtp-host";

/** Align with mailer: 465 = implicit TLS, 587 = STARTTLS. */
function normalizeSecureForPort(port: number, secure: boolean): boolean {
  if (port === 465) return true;
  if (port === 587) return false;
  return secure;
}

export async function getSmtpSettings() {
  let row = await prisma.smtpSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row) {
    row = await prisma.smtpSettings.create({ data: {} });
  }
  return {
    id: row.id,
    host: normalizeSmtpHost(row.host),
    port: row.port,
    secure: normalizeSecureForPort(row.port, row.secure),
    authUser: row.authUser,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    hasPassword: Boolean(row.authPassword),
  };
}

export async function updateSmtpSettings(data: {
  host?: string;
  port?: number;
  secure?: boolean;
  authUser?: string;
  authPassword?: string | null;
  fromEmail?: string;
  fromName?: string;
}) {
  let row = await prisma.smtpSettings.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!row) row = await prisma.smtpSettings.create({ data: {} });

  const update: Record<string, unknown> = {};
  if (data.host !== undefined) update.host = normalizeSmtpHost(data.host);
  if (data.port !== undefined) update.port = data.port;
  if (data.secure !== undefined) update.secure = data.secure;
  if (data.authUser !== undefined) update.authUser = data.authUser;
  if (data.fromEmail !== undefined) update.fromEmail = data.fromEmail;
  if (data.fromName !== undefined) update.fromName = data.fromName;
  if (data.authPassword !== undefined && data.authPassword !== null && data.authPassword !== "") {
    update.authPassword = encryptSecret(data.authPassword);
  }

  const mergedPort = data.port !== undefined ? data.port : row.port;
  const mergedSecure = data.secure !== undefined ? data.secure : row.secure;
  const normalizedSecure = normalizeSecureForPort(mergedPort, mergedSecure);
  if (Object.keys(update).length > 0 || normalizedSecure !== row.secure || mergedPort !== row.port) {
    update.port = mergedPort;
    update.secure = normalizedSecure;
  }

  if (Object.keys(update).length === 0) {
    return prisma.smtpSettings.findUniqueOrThrow({ where: { id: row.id } });
  }

  return prisma.smtpSettings.update({ where: { id: row.id }, data: update as object });
}
