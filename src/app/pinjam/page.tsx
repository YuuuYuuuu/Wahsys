"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLogo } from "@/components/ui/app-logo";
import { toast } from "@/hooks/use-toast";
import { ItemCondition } from "@prisma/client";

type PublicItem = {
  id: string;
  name: string;
  stock: number;
  location: string;
  condition: ItemCondition;
  imageUrl: string | null;
  category: { name: string };
};

type LoanRequestResult =
  | { outcome: "pending_approval"; loanId: string }
  | { outcome: "insufficient_stock" };

export default function PinjamPage() {
  const [itemId, setItemId] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["public-items"],
    queryFn: async () => {
      const res = await fetch("/api/public/items", { credentials: "omit" });
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<PublicItem[]>;
    },
  });

  const requestLoan = useMutation({
    mutationFn: async () => {
      const due = new Date(dueDate);
      if (Number.isNaN(due.getTime())) throw new Error("Tanggal kembali wajib diisi");
      const res = await fetch("/api/public/loan-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          itemId,
          borrowerName,
          borrowerEmail,
          borrowerPhone,
          quantity,
          location: location || "",
          dueDate: due.toISOString(),
        }),
      });
      const j = (await res.json().catch(() => ({}))) as LoanRequestResult & { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Permintaan gagal");
      return j as LoanRequestResult;
    },
    onSuccess: (data) => {
      if (data.outcome === "pending_approval") {
        toast({
          title: "Permintaan terkirim",
          description:
            "Petugas akan meninjau pengajuan Anda. Setelah disetujui, Anda akan menerima email berisi tautan untuk mengonfirmasi peminjaman.",
        });
      } else {
        toast({
          title: "Permintaan terkirim",
          description: "Rincian telah dikirim ke email Anda.",
        });
      }
      setBorrowerName("");
      setBorrowerEmail("");
      setBorrowerPhone("");
      setQuantity(1);
      setLocation("");
      setDueDate("");
      setItemId("");
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-3.5">
          <AppLogo size="sm" />
          <Link href="/login" className="text-xs font-medium text-muted-foreground hover:text-foreground">
            Masuk Portal →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-lg space-y-8 px-4 py-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display), serif" }}>
            Pinjam
          </h1>
          <p className="text-sm text-muted-foreground">
            Pilih barang, isi data kontak, dan kirim permintaan. Persetujuan dilakukan oleh petugas sebelum Anda menerima email konfirmasi.
          </p>
        </div>

        <Card className="border-border/80 shadow-lg shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Formulir</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div>
              <Label>Barang</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                disabled={isLoading}
              >
                <option value="">{isLoading ? "Memuat…" : "Pilih barang…"}</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} (stok: {it.stock})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nama lengkap</Label>
              <Input className="mt-1" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
            </div>
            <div>
              <Label>Email</Label>
              <Input className="mt-1" type="email" value={borrowerEmail} onChange={(e) => setBorrowerEmail(e.target.value)} />
            </div>
            <div>
              <Label>Nomor telepon</Label>
              <Input className="mt-1" value={borrowerPhone} onChange={(e) => setBorrowerPhone(e.target.value)} />
            </div>
            <div>
              <Label>Jumlah</Label>
              <Input className="mt-1" type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
            </div>
            <div>
              <Label>Rencana tanggal kembali</Label>
              <Input className="mt-1" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Input className="mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <Button
              className="mt-2"
              disabled={
                !itemId ||
                !borrowerName ||
                !borrowerEmail ||
                !borrowerPhone ||
                !dueDate ||
                requestLoan.isPending
              }
              onClick={() => requestLoan.mutate()}
            >
              Kirim permintaan
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
