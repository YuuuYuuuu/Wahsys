/** Map Nodemailer / SMTP failures to user-facing Indonesian messages. */
export function formatSmtpSendError(err: unknown): string {
  if (!(err instanceof Error)) return "Gagal mengirim email";
  const e = err as Error & { response?: string; responseCode?: number; command?: string };
  const code = e.responseCode;
  const msg = e.message ?? "";

  if (code === 535) {
    return "Autentikasi SMTP ditolak (535). Periksa email pengguna, App Password Gmail (16 karakter), dan pastikan 2FA aktif.";
  }
  if (code === 534) {
    return "Mekanisme autentikasi ditolak (534). Coba port 587 + TLS/SSL mati, atau port 465 + TLS/SSL aktif.";
  }
  if (code === 550 || code === 553) {
    return `Pengiriman ditolak (${code}). Periksa From email (harus sesuai akun pengirim) dan alamat tujuan.`;
  }
  if (/socket close|Socket closed|Unexpected socket/i.test(msg)) {
    return "Koneksi SMTP terputus. Gmail: pakai port 587 dengan TLS/SSL mati (STARTTLS), atau port 465 dengan TLS/SSL aktif — jangan kombinasi 465 + TLS mati.";
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET/i.test(msg)) {
    return "Tidak bisa terhubung ke server SMTP. Periksa host (tanpa http://), port, firewall, dan koneksi internet.";
  }
  if (/certificate|SSL|TLS|UNABLE_TO_VERIFY/i.test(msg)) {
    return `Masalah sertifikat TLS: ${msg}`;
  }
  if (e.response && typeof e.response === "string") {
    const short = e.response.split("\n")[0].slice(0, 200);
    return `SMTP: ${short}`;
  }
  return msg || "Gagal mengirim email";
}
