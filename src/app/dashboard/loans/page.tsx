"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { LoanStatus } from "@prisma/client";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Package,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  UserCheck,
  Check,
  X,
  CheckCircle2,
  RotateCcw,
  Inbox,
} from "lucide-react";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { cn } from "@/lib/utils";

type Loan = {
  id: string;
  borrowerName: string;
  borrowerEmail: string | null;
  borrowerPhone: string | null;
  quantity: number;
  loanDate: string;
  dueDate: string | null;
  returnDate: string | null;
  location: string;
  status: LoanStatus;
  item: { name: string };
  user: { name: string; email: string } | null;
};

type ItemOpt = { id: string; name: string; stock: number };

const LOANS_PAGE_SIZE = 10;

type LoanListResponse = {
  items: Loan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const FILTER_TABS: { label: string; value: LoanStatus | "" }[] = [
  { label: "Semua", value: "" },
  { label: "Menunggu", value: "MENUNGGU_PERSETUJUAN" },
  { label: "Konfirmasi", value: "MENUNGGU_KONFIRMASI" },
  { label: "Dipinjam", value: "DIPINJAM" },
  { label: "Dikembalikan", value: "DIKEMBALIKAN" },
  { label: "Ditolak", value: "DITOLAK" },
];

function statusBadgeVariant(s: LoanStatus): "default" | "secondary" | "outline" {
  if (s === "DIPINJAM") return "default";
  if (s === "MENUNGGU_KONFIRMASI") return "secondary";
  return "outline";
}

function statusBadgeClass(s: LoanStatus): string {
  switch (s) {
    case "MENUNGGU_PERSETUJUAN":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "MENUNGGU_KONFIRMASI":
      return "border-purple-500/40 bg-purple-500/10 text-purple-700 dark:text-purple-400";
    case "DIPINJAM":
      return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400";
    case "DIKEMBALIKAN":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    case "DITOLAK":
      return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    default:
      return "";
  }
}

function statusLabel(s: LoanStatus): string {
  switch (s) {
    case "MENUNGGU_PERSETUJUAN":
      return "Menunggu persetujuan";
    case "MENUNGGU_KONFIRMASI":
      return "Menunggu konfirmasi";
    case "DIPINJAM":
      return "Dipinjam";
    case "DIKEMBALIKAN":
      return "Dikembalikan";
    case "DITOLAK":
      return "Ditolak";
    default:
      return s;
  }
}

export default function LoansPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<LoanStatus | "">("");
  const [page, setPage] = useState(1);
  const [itemId, setItemId] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loansQuery = new URLSearchParams({
    page: String(page),
    limit: String(LOANS_PAGE_SIZE),
  });
  if (filterStatus) loansQuery.set("status", filterStatus);

  const { data: loansPage } = useQuery({
    queryKey: ["loans", filterStatus, page],
    queryFn: async () => {
      const res = await apiFetch(`/api/loans?${loansQuery.toString()}`);
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<LoanListResponse>;
    },
  });

  const loans = loansPage?.items ?? [];
  const total = loansPage?.total ?? 0;
  const totalPages = loansPage?.totalPages ?? 1;
  const pageSize = loansPage?.pageSize ?? LOANS_PAGE_SIZE;
  const safePage = loansPage?.page ?? page;

  useEffect(() => {
    if (loansPage && loansPage.page !== page) setPage(loansPage.page);
  }, [loansPage, page]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("dueSoon") === "1") {
      setFilterStatus("DIPINJAM");
      toast({
        title: "Filter dipinjam",
        description: "Daftar di bawah: periksa jatuh tempo (lihat juga kartu di ringkasan untuk ≤7 hari).",
      });
    }
    const focusId = sp.get("id");
    if (focusId) {
      queueMicrotask(() =>
        document.getElementById(`loan-row-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
    }
  }, []);

  const rangeFrom = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(total, (safePage - 1) * pageSize + loans.length);

  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const res = await apiFetch("/api/items");
      if (!res.ok) throw new Error("fail");
      return res.json() as Promise<ItemOpt[]>;
    },
  });

  const createLoan = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        itemId,
        borrowerName,
        quantity,
        loanDate: new Date().toISOString(),
        location,
      };
      if (dueDate) body.dueDate = new Date(dueDate).toISOString();
      const res = await apiFetch("/api/loans", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "fail");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setOpen(false);
      setDueDate("");
      toast({ title: "Peminjaman dibuat" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const approveLoan = useMutation({
    mutationFn: async (loanId: string) => {
      const res = await apiFetch(`/api/loans/${loanId}/approve`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal menyetujui");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Disetujui", description: "Email persetujuan dikirim ke peminjam." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const rejectLoan = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await apiFetch(`/api/loans/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal menolak");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setRejectOpen(false);
      setRejectId(null);
      setRejectReason("");
      toast({ title: "Pengajuan ditolak" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const confirmLoan = useMutation({
    mutationFn: async (loanId: string) => {
      const res = await apiFetch(`/api/loans/${loanId}/confirm`, { method: "POST" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Gagal konfirmasi");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Konfirmasi selesai", description: "Stok berkurang; peminjaman aktif (Dipinjam)." });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: e.message }),
  });

  const returnLoan = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/loans/${id}/return`, { method: "POST", body: JSON.stringify({}) });
      if (!res.ok) throw new Error("fail");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["items"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Barang dikembalikan" });
    },
    onError: () => toast({ variant: "destructive", title: "Gagal pengembalian" }),
  });

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          <ExportCsvButton
            href={`/api/export/loans?limit=2000${filterStatus ? `&status=${encodeURIComponent(filterStatus)}` : ""}`}
            label="CSV pinjaman"
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs">
                Pinjam barang (petugas)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Peminjaman baru</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div>
                  <Label>Barang</Label>
                  <select
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                  >
                    <option value="">Pilih…</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} (stok: {i.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Nama peminjam</Label>
                  <Input value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} />
                </div>
                <div>
                  <Label>Jumlah</Label>
                  <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Lokasi pinjam</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
                <div>
                  <Label>Tanggal kembali (opsional)</Label>
                  <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <Button onClick={() => createLoan.mutate()} disabled={!itemId || !borrowerName || !location}>
                  Simpan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </HeaderActions>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak pengajuan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Peminjam akan menerima email penolakan (jika template <code className="rounded bg-muted px-1">LOAN_REJECTED</code>{" "}
            ada). Alasan opsional ditampilkan di email.
          </p>
          <Textarea
            placeholder="Alasan penolakan (opsional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setRejectOpen(false)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectId || rejectLoan.isPending}
              onClick={() => rejectId && rejectLoan.mutate({ id: rejectId, reason: rejectReason })}
            >
              Tolak pengajuan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Daftar Peminjaman</CardTitle>
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground bg-muted/50">
                {total} total
              </Badge>
            </div>
            {/* Quick dropdown for direct selection */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">Filter:</span>
              <select
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={filterStatus}
                onChange={(e) => setFilterStatus((e.target.value as LoanStatus | "") || "")}
              >
                <option value="">Semua status</option>
                <option value="MENUNGGU_PERSETUJUAN">Menunggu persetujuan admin</option>
                <option value="MENUNGGU_KONFIRMASI">Menunggu konfirmasi</option>
                <option value="DIPINJAM">Dipinjam</option>
                <option value="DIKEMBALIKAN">Dikembalikan</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Pill Buttons (Horizontally Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar -mx-1 px-1">
            {FILTER_TABS.map((tab) => {
              const isActive = filterStatus === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setFilterStatus(tab.value)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Belum ada peminjaman</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {filterStatus
                  ? "Tidak ada transaksi peminjaman dengan filter status yang dipilih."
                  : "Belum ada transaksi peminjaman tercatat di sistem."}
              </p>
              {filterStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs h-8"
                  onClick={() => setFilterStatus("")}
                >
                  Tampilkan semua status
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* MOBILE CARDS VIEW (< md) */}
              <div className="space-y-3 p-3.5 block md:hidden">
                {loans.map((l) => (
                  <div
                    key={l.id}
                    id={`loan-row-${l.id}`}
                    className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs transition-colors hover:border-primary/40"
                  >
                    {/* Item & Status Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Package className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-foreground leading-tight truncate">
                            {l.item.name}
                          </h4>
                          <span className="text-[11px] font-medium text-muted-foreground">
                            Jumlah: <strong className="text-foreground">{l.quantity} unit</strong>
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={statusBadgeVariant(l.status)}
                        className={cn("text-[10px] shrink-0 font-medium px-2 py-0.5", statusBadgeClass(l.status))}
                      >
                        {statusLabel(l.status)}
                      </Badge>
                    </div>

                    {/* Borrower and Location Info Block */}
                    <div className="rounded-lg bg-muted/40 p-2.5 space-y-2 text-xs">
                      {/* Borrower Name */}
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{l.borrowerName}</span>
                      </div>

                      {/* Contact Info (Email & Phone) */}
                      {(l.borrowerEmail || l.borrowerPhone) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-[11px]">
                          {l.borrowerEmail && (
                            <a
                              href={`mailto:${l.borrowerEmail}`}
                              className="inline-flex items-center gap-1 truncate max-w-[200px] hover:text-foreground"
                            >
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{l.borrowerEmail}</span>
                            </a>
                          )}
                          {l.borrowerPhone && (
                            <a
                              href={`tel:${l.borrowerPhone}`}
                              className="inline-flex items-center gap-1 hover:text-foreground"
                            >
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{l.borrowerPhone}</span>
                            </a>
                          )}
                        </div>
                      )}

                      {/* Meta Information (Location, Dates, Officer) */}
                      <div className="grid grid-cols-1 gap-1 pt-1.5 border-t border-border/50 text-[11px] text-muted-foreground">
                        {l.location && (
                          <div className="inline-flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                            <span className="truncate">{l.location}</span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                          <span>
                            Pinjam:{" "}
                            {new Date(l.loanDate).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {l.dueDate && (
                          <div className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>
                              Tenggat:{" "}
                              {new Date(l.dueDate).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        <div className="inline-flex items-center gap-1 text-muted-foreground/80">
                          <UserCheck className="h-3 w-3 shrink-0" />
                          <span>Petugas: {l.user?.name ?? "Publik"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Action Buttons on Card */}
                    {l.status === "MENUNGGU_PERSETUJUAN" && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground shadow-xs"
                          disabled={approveLoan.isPending}
                          onClick={() => approveLoan.mutate(l.id)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-medium gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={rejectLoan.isPending}
                          onClick={() => {
                            setRejectId(l.id);
                            setRejectReason("");
                            setRejectOpen(true);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                          Tolak
                        </Button>
                      </div>
                    )}
                    {l.status === "MENUNGGU_KONFIRMASI" && (
                      <div className="pt-1 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full h-8 text-xs font-medium gap-1.5"
                          disabled={confirmLoan.isPending}
                          onClick={() => confirmLoan.mutate(l.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Konfirmasi di sini
                        </Button>
                      </div>
                    )}
                    {l.status === "DIPINJAM" && (
                      <div className="pt-1 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-8 text-xs font-medium gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          onClick={() => returnLoan.mutate(l.id)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Kembalikan Barang
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (hidden md:block) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead>Peminjam</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telp</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pinjam</TableHead>
                      <TableHead>Kembali</TableHead>
                      <TableHead>Petugas</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((l) => (
                      <TableRow key={l.id} id={`loan-row-${l.id}`}>
                        <TableCell className="font-medium">{l.item.name}</TableCell>
                        <TableCell>{l.borrowerName}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs">{l.borrowerEmail ?? "—"}</TableCell>
                        <TableCell className="text-xs">{l.borrowerPhone ?? "—"}</TableCell>
                        <TableCell>{l.quantity}</TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadgeVariant(l.status)}
                            className={cn("text-[10px] font-medium", statusBadgeClass(l.status))}
                          >
                            {statusLabel(l.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(l.loanDate).toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {l.dueDate ? new Date(l.dueDate).toLocaleString("id-ID") : "—"}
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate text-xs">{l.user?.name ?? "Publik"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {l.status === "MENUNGGU_PERSETUJUAN" && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={approveLoan.isPending}
                                  onClick={() => approveLoan.mutate(l.id)}
                                >
                                  Setujui
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={rejectLoan.isPending}
                                  onClick={() => {
                                    setRejectId(l.id);
                                    setRejectReason("");
                                    setRejectOpen(true);
                                  }}
                                >
                                  Tolak
                                </Button>
                              </>
                            )}
                            {l.status === "MENUNGGU_KONFIRMASI" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs"
                                disabled={confirmLoan.isPending}
                                onClick={() => confirmLoan.mutate(l.id)}
                              >
                                Konfirmasi
                              </Button>
                            )}
                            {l.status === "DIPINJAM" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => returnLoan.mutate(l.id)}
                              >
                                Kembalikan
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Menampilkan {rangeFrom}–{rangeTo} dari {total} · Halaman {safePage} dari {totalPages}
          </p>
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 flex-1 sm:flex-none h-8 text-xs"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              Sebelumnya
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 flex-1 sm:flex-none h-8 text-xs"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
