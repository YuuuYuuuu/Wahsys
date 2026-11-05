"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";
import { HeaderActions } from "@/components/dashboard/header-actions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FileQuestion,
  Archive,
  TrendingUp,
  CheckCheck,
  AlertTriangle,
  Download,
} from "lucide-react";

type ReportsData = {
  metrics: {
    totalLost: number;
    resolvedLost: number;
    totalFound: number;
    returnedFound: number;
    unclaimedFound: number;
    returnRate: string;
    totalClaims: number;
    approvedClaims: number;
    rejectedClaims: number;
    claimApprovalRate: string;
  };
  byCategory: { category: string; count: number }[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"];

export default function LostFoundReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["lost-found-reports"],
    queryFn: async () => {
      const res = await apiFetch("/api/lost-found/reports");
      if (!res.ok) throw new Error("Gagal mengambil data laporan");
      return res.json() as Promise<ReportsData>;
    },
  });

  if (isLoading || !data) {
    return <p className="text-xs text-muted-foreground py-8">Memuat analitik laporan operasional…</p>;
  }

  const { metrics, byCategory } = data;

  return (
    <div className="space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          <ExportCsvButton href="/api/export/lost-found?type=lost" label="CSV Laporan Hilang" />
          <ExportCsvButton href="/api/export/lost-found?type=found" label="CSV Barang Temuan" />
          <ExportCsvButton href="/api/export/lost-found?type=claims" label="CSV Data Klaim" />
          <ExportCsvButton href="/api/export/lost-found?type=handovers" label="CSV Serah Terima" />
        </div>
      </HeaderActions>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tingkat Pengembalian</CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{metrics.returnRate}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {metrics.returnedFound} dari {metrics.totalFound} barang temuan kembali
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Rasio Persetujuan Klaim</CardTitle>
            <div className="rounded-md bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <CheckCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{metrics.claimApprovalRate}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {metrics.approvedClaims} disetujui ({metrics.rejectedClaims} ditolak)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Penyelesaian Kehilangan</CardTitle>
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <FileQuestion className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {metrics.resolvedLost} / {metrics.totalLost}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Laporan kehilangan yang terselesaikan</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">Barang Belum Diklaim</CardTitle>
            <div className="rounded-md bg-rose-500/10 p-1.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">{metrics.unclaimedFound}</div>
            <p className="mt-1 text-[11px] text-muted-foreground">Melewati batas waktu penyimpanan</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Barang Temuan Berdasarkan Kategori */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribusi Barang Temuan Berdasarkan Kategori</CardTitle>
          <p className="text-xs text-muted-foreground">
            Jumlah barang temuan fisik yang terdaftar pada masing-masing kategori
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Jumlah Barang" radius={[4, 4, 0, 0]}>
                  {byCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Ekspor Operasional Cepat */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Pusat Ekspor Laporan Data Operasional</CardTitle>
          <p className="text-xs text-muted-foreground">
            Unduh seluruh berkas data operasional Lost & Found dalam format spreadsheet CSV untuk keperluan rekap dan arsip.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-2">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="font-semibold text-xs text-foreground">Laporan Kehilangan</p>
            <p className="text-[11px] text-muted-foreground">
              Rekap seluruh tiket barang hilang, identitas pelapor, lokasi, dan status.
            </p>
            <ExportCsvButton href="/api/export/lost-found?type=lost" label="Unduh CSV Kehilangan" />
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="font-semibold text-xs text-foreground">Katalog Barang Temuan</p>
            <p className="text-[11px] text-muted-foreground">
              Data inventaris fisik barang temuan, lokasi simpan, kondisi, dan status.
            </p>
            <ExportCsvButton href="/api/export/lost-found?type=found" label="Unduh CSV Barang Temuan" />
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="font-semibold text-xs text-foreground">Pengajuan Klaim</p>
            <p className="text-[11px] text-muted-foreground">
              Rekap klaim kepemilikan oleh pemohon beserta keterangan bukti dan keputusan.
            </p>
            <ExportCsvButton href="/api/export/lost-found?type=claims" label="Unduh CSV Data Klaim" />
          </div>
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="font-semibold text-xs text-foreground">Transaksi Serah Terima</p>
            <p className="text-[11px] text-muted-foreground">
              Log serah terima barang kepada pemilik sah lengkap dengan tanggal dan petugas.
            </p>
            <ExportCsvButton href="/api/export/lost-found?type=handovers" label="Unduh CSV Serah Terima" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

