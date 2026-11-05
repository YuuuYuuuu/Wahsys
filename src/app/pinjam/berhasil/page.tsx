import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PinjamBerhasilPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-muted/40 to-background px-4">
      <div className="max-w-md text-center space-y-2">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display), serif" }}>
          Peminjaman dikonfirmasi
        </h1>
        <p className="text-sm text-muted-foreground">
          Stok telah dikurangi dan status peminjaman aktif. Simpan email Anda sebagai bukti.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/pinjam">Pinjam lagi</Link>
        </Button>
        <Button asChild>
          <Link href="/">Beranda</Link>
        </Button>
      </div>
    </div>
  );
}
