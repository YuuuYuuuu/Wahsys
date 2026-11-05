"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Package,
  Boxes,
  HandCoins,
  AlertTriangle,
  MailWarning,
  User,
  ClipboardList,
  CalendarDays,
  LayoutDashboard,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

type Stats = {
  itemsByCondition: { condition: string; count: number }[];
  activeLoans: number;
  pendingApprovalLoans: number;
  pendingConfirmLoans: number;
  totalStock: number;
  borrowedUnitsOnLoan: number;
  itemKinds: number;
  categoryCount: number;
  lowStockCount: number;
  lowStockThreshold: number;
  recentActiveLoans: {
    id: string;
    borrowerName: string;
    quantity: number;
    loanDate: string;
    item: { name: string };
    user: { name: string; email: string } | null;
  }[];
  loansDueSoonCount: number;
  loansDueSoon: {
    id: string;
    borrowerName: string;
    quantity: number;
    dueDate: string | null;
    item: { name: string };
    user: { name: string; email: string } | null;
  }[];
};

const COLORS = ["#334155", "#ca8a04", "#b91c1c"];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<Stats>;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-xs text-muted-foreground">
        Memuat statistik operasional…
      </div>
    );
  }

  const stockVsBorrowed = [
    { name: "Di gudang", value: data.totalStock },
    { name: "Sedang dipinjam", value: data.borrowedUnitsOnLoan },
  ];

  const statCards: {
    title: string;
    value: number;
    icon: typeof Package;
    accent: string;
    bg: string;
    href?: string;
  }[] = [
    {
      title: "Jenis barang",
      value: data.itemKinds,
      icon: Package,
      accent: "text-[oklch(0.35_0.08_260)]",
      bg: "bg-[oklch(0.35_0.08_260/0.1)]",
      href: "/dashboard/inventory",
    },
    {
      title: "Total stok unit",
      value: data.totalStock,
      icon: Boxes,
      accent: "text-[oklch(0.45_0.12_200)]",
      bg: "bg-[oklch(0.45_0.12_200/0.12)]",
      href: "/dashboard/inventory",
    },
    {
      title: "Peminjaman aktif",
      value: data.activeLoans,
      icon: HandCoins,
      accent: "text-[oklch(0.42_0.14_145)]",
      bg: "bg-[oklch(0.42_0.14_145/0.12)]",
      href: "/dashboard/loans",
    },
    {
      title: "Menunggu persetujuan",
      value: data.pendingApprovalLoans,
      icon: ClipboardList,
      accent: "text-[oklch(0.42_0.12_280)]",
      bg: "bg-[oklch(0.42_0.12_280/0.12)]",
      href: "/dashboard/loans",
    },
    {
      title: "Menunggu konfirmasi",
      value: data.pendingConfirmLoans,
      icon: MailWarning,
      accent: "text-[oklch(0.55_0.16_75)]",
      bg: "bg-[oklch(0.55_0.16_75/0.14)]",
      href: "/dashboard/loans",
    },
    {
      title: `Stok rendah (≤${data.lowStockThreshold})`,
      value: data.lowStockCount,
      icon: AlertTriangle,
      accent: "text-[oklch(0.55_0.2_25)]",
      bg: "bg-[oklch(0.55_0.2_25/0.1)]",
      href: "/dashboard/inventory?lowStock=1",
    },
    {
      title: "Jatuh tempo ≤7 hari",
      value: data.loansDueSoonCount,
      icon: CalendarDays,
      accent: "text-[oklch(0.42_0.1_200)]",
      bg: "bg-[oklch(0.42_0.1_200/0.12)]",
      href: "/dashboard/loans?dueSoon=1",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner Card */}
      <div className="rounded-xl border border-border/70 bg-gradient-to-r from-primary/10 via-card to-card p-3.5 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-primary">
                WahSys Operational Hub
              </span>
            </div>
            <h1
              className="text-lg sm:text-2xl font-bold tracking-tight text-foreground mt-0.5"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Halo, {user?.name || "Petugas"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Ringkasan inventaris, status peminjaman, dan sirkulasi hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-[11px] sm:text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/60">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards: 2 Kolom di Mobile, Responsif di Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        {statCards.map((s, index) => {
          const isLastAndOdd = index === statCards.length - 1 && statCards.length % 2 !== 0;
          const inner = (
            <Card
              className={cn(
                "h-full border-border/80 shadow-2xs transition-all duration-150 p-3 sm:p-4 flex flex-col justify-between",
                s.href && "hover:border-primary/40 hover:shadow-xs active:scale-[0.98]"
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">{s.title}</span>
                <span className={cn("flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg", s.bg)}>
                  <s.icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", s.accent)} aria-hidden />
                </span>
              </div>
              <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold tabular-nums text-foreground tracking-tight">{s.value}</span>
                {s.href && (
                  <span className="text-[10px] text-primary font-medium hover:underline flex items-center">
                    Detail →
                  </span>
                )}
              </div>
            </Card>
          );

          return s.href ? (
            <Link
              key={s.title}
              href={s.href}
              className={cn(
                "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isLastAndOdd && "col-span-2 sm:col-span-1"
              )}
            >
              {inner}
            </Link>
          ) : (
            <div key={s.title} className={cn(isLastAndOdd && "col-span-2 sm:col-span-1")}>
              {inner}
            </div>
          );
        })}
      </div>

      {/* Pinjaman Jatuh Tempo */}
      {data.loansDueSoon.length > 0 && (
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-3 sm:p-5 pb-2 sm:pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-sm sm:text-base font-semibold">Pinjaman jatuh tempo (minggu ini)</CardTitle>
            </div>
            <Link href="/dashboard/loans?dueSoon=1" className="text-xs font-medium text-primary hover:underline">
              Lihat semua ({data.loansDueSoonCount}) →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 p-3 sm:p-5 pt-3">
            {data.loansDueSoon.map((l) => (
              <Link
                key={l.id}
                href={`/dashboard/loans?id=${encodeURIComponent(l.id)}&dueSoon=1`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs transition-colors hover:bg-muted/40 hover:border-primary/30"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-semibold text-foreground">{l.borrowerName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate text-muted-foreground">{l.item.name}</span>
                  <span className="text-primary font-bold">×{l.quantity}</span>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
                  Jatuh tempo: {l.dueDate ? new Date(l.dueDate).toLocaleDateString("id-ID", { dateStyle: "medium" }) : "—"}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Peminjaman Aktif Terbaru */}
      {data.recentActiveLoans.length > 0 && (
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 p-3 sm:p-5 pb-2 sm:pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-sm sm:text-base font-semibold">Peminjaman aktif terbaru</CardTitle>
            </div>
            <Link href="/dashboard/loans" className="text-xs font-medium text-primary hover:underline">
              Kelola pinjaman →
            </Link>
          </CardHeader>
          <CardContent className="space-y-2 p-3 sm:p-5 pt-3">
            {data.recentActiveLoans.map((l) => (
              <div
                key={l.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate font-semibold text-foreground">{l.borrowerName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate text-muted-foreground">{l.item.name}</span>
                  <span className="text-primary font-bold">×{l.quantity}</span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {l.user?.name ?? "Publik"} · {new Date(l.loanDate).toLocaleDateString("id-ID")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Grafik Ringkasan Visual */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold">Barang per kondisi</CardTitle>
          </CardHeader>
          <CardContent className="h-60 sm:h-72 p-2 sm:p-4 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.itemsByCondition.map((x) => ({ name: x.condition.replace(/_/g, " "), count: x.count }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="oklch(0.35 0.08 260)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="p-3.5 sm:p-5 pb-2">
            <CardTitle className="text-sm sm:text-base font-semibold">Stok gudang vs unit dipinjam</CardTitle>
          </CardHeader>
          <CardContent className="h-60 sm:h-72 p-2 sm:p-4 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockVsBorrowed}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={36}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stockVsBorrowed.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
