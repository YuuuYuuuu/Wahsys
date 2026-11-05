/** Strip http(s):// or smtp(s):// so Nodemailer gets a plain hostname. */
export function normalizeSmtpHost(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  const noProto = t.replace(/^https?:\/\//i, "").replace(/^smtps?:\/\//i, "");
  const hostPort = noProto.split("/")[0].trim();
  return hostPort.split(":")[0].trim();
}
