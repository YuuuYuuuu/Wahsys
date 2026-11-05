import Link from "next/link";
import { Button } from "@/components/ui/button";

const reasons: Record<string, string> = {
  token: "Tautan tidak lengkap.",
  invalid: "Tautan tidak valid atau sudah digunakan.",
  kedaluwarsa: "Tautan konfirmasi sudah kedaluwarsa. Ajukan peminjaman ulang.",
  stok: "Stok tidak mencukupi saat konfirmasi. Barang mungkin sudah habis — ajukan ulang.",
};

export default async function PinjamGagalPage({
  searchParams,
}: {
  searchParams: Promise<{ alasan?: string }>;
}) {
  const sp = await searchParams;
  const alasan = sp.alasan ?? "invalid";
  const msg = reasons[alasan] ?? reasons.invalid;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-muted/40 to-background px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-2xl font-semibold text-destructive" style={{ fontFamily: "var(--font-display), serif" }}>
          Konfirmasi gagal
        </h1>
        <p className="text-sm text-muted-foreground">{msg}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/pinjam">Coba lagi</Link>
        </Button>
        <Button asChild>
          <Link href="/">Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
