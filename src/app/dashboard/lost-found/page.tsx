"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeaderActions } from "@/components/dashboard/header-actions";
import { cn } from "@/lib/utils";
import {
  Search,
  FileQuestion,
  Archive,
  CheckCheck,
  Handshake,
  TrendingUp,
  Clock,
  ArrowRight,
  PlusCircle,
  Sparkles,
  MapPin,
  Calendar,
  User,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type DashboardData = {
  overview: {
    totalLost: number;
    activeLost: number;
    resolvedLost: number;
    totalFound: number;
    availableFound: number;
    reservedFound: number;
    returnedFound: number;
    pendingClaims: number;
    approvedClaims: number;
    scheduledHandovers: number;
    completedHandovers: number;
    returnRate: number;
  };
  monthlyStats: { month: string; lost: number; found: number; returned: number }[];
  recentLost: {
    id: string;
    ticketNumber: string;
    itemName: string;
    category: string;
    lastLocation: string;
    status: string;
    createdAt: string;
    user: { name: string; email: string };
  }[];
  recentFound: {
    id: string;
    itemCode: string;
    itemName: string;
    category: string;
    foundLocation: string;
    status: string;
    createdAt: string;
    expiredAt?: string | null;
  }[];
};

function lostStatusInfo(status: string) {
  switch (status) {
    case "SUBMITTED":
      return {
        label: "Menunggu Verifikasi",
        className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    case "VERIFIED":
      return {
        label: "Terverifikasi",
        className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      };
    case "MATCH_FOUND":
      return {
        label: "Ada Kecocokan",
        className: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300",
      };
    case "RESOLVED":
      return {
        label: "Selesai Dikembalikan",
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "REJECTED":
      return {
        label: "Ditolak",
        className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      };
    case "CANCELLED":
      return {
        label: "Dibatalkan",
        className: "border-muted-foreground/30 bg-muted text-muted-foreground",
      };
    default:
      return {
        label: status.replace(/_/g, " "),
        className: "",
      };
  }
}

function foundStatusInfo(status: string) {
  switch (status) {
    case "AVAILABLE":
      return {
        label: "Tersedia",
        className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "CLAIM_IN_PROGRESS":
      return {
        label: "Proses Klaim",
        className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
      };
    case "RETURNED":
      return {
        label: "Sudah Diserahkan",
        className: "border-muted-foreground/30 bg-muted text-muted-foreground",
      };
    case "DISPOSED":
      return {
        label: "Dimusnahkan",
        className: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
      };
    case "EXPIRED":
      return {
        label: "Kedaluwarsa",
        className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
      };
    default:
      return {
        label: status.replace(/_/g, " "),
        className: "",
      };
  }
}

export default function LostFoundOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["lost-found-dashboard"],
    queryFn: async () => {
      const res = await apiFetch("/api/lost-found/dashboard");
      if (!res.ok) throw new Error("Gagal memuat statistik");
      return res.json() as Promise<DashboardData>;
    },
  });

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Memuat data Lost & Found…</p>;
  }

  const { overview } = data;

  const statCards = [
    {
      title: "Laporan Kehilangan Aktif",
      value: overview.activeLost,
      desc: `Total ${overview.totalLost} laporan`,
      icon: FileQuestion,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
      href: "/dashboard/lost-found/lost",
    },
    {
      title: "Barang Temuan Tersedia",
      value: overview.availableFound,
      desc: `Dari ${overview.totalFound} inventaris fisik`,
      icon: Archive,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
      href: "/dashboard/lost-found/found",
    },
    {
      title: "Klaim Menunggu Verifikasi",
      value: overview.pendingClaims,
      desc: `${overview.approvedClaims} klaim disetujui`,
      icon: CheckCheck,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
      href: "/dashboard/lost-found/claims",
    },
    {
      title: "Serah Terima Terjadwal",
      value: overview.scheduledHandovers,
      desc: `${overview.completedHandovers} selesai diserahkan`,
      icon: Handshake,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10",
      href: "/dashboard/lost-found/handovers",
    },
    {
      title: "Tingkat Pengembalian",
      value: `${overview.returnRate}%`,
      desc: `${overview.returnedFound} barang kembali ke pemilik`,
      icon: TrendingUp,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      href: "/dashboard/lost-found/reports",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <HeaderActions>
        <div className="flex items-center gap-2 flex-nowrap md:flex-wrap">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href="/dashboard/lost-found/lost">
              <FileQuestion className="h-3.5 w-3.5" />
              Lapor Kehilangan
            </Link>
          </Button>
          <Button asChild size="sm" className="h-8 text-xs gap-1.5">
            <Link href="/dashboard/lost-found/found">
              <PlusCircle className="h-3.5 w-3.5" />
              Lapor / Registrasi Temuan
            </Link>
          </Button>
        </div>
      </HeaderActions>

      {/* Welcome Banner Card */}
      <div className="rounded-xl border border-border/70 bg-gradient-to-r from-blue-500/10 via-card to-card p-3.5 sm:p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Lost & Found Center
              </span>
            </div>
            <h1
              className="text-lg sm:text-2xl font-bold tracking-tight text-foreground mt-0.5"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              Ikhtisar Lost & Found
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pencatatan barang hilang, inventaris fisik temuan, dan monitoring verifikasi klaim.
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

      {/* Metric Cards: 2 Kolom di Mobile, Responsif di Desktop */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          const isLastAndOdd = index === statCards.length - 1 && statCards.length % 2 !== 0;

          return (
            <Link
              key={card.title}
              href={card.href}
              className={cn(
                "block transition-all hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl",
                isLastAndOdd && "col-span-2 sm:col-span-1"
              )}
            >
              <Card className="h-full border-border/80 shadow-2xs transition-all duration-150 p-3 sm:p-4 flex flex-col justify-between hover:border-primary/40 hover:shadow-xs active:scale-[0.98]">
                {isLastAndOdd ? (
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{card.title}</span>
                      <div className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground mt-0.5">
                        {card.value}
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{card.desc}</p>
                    </div>
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", card.bg)}>
                      <Icon className={cn("h-4 w-4", card.color)} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] sm:text-xs font-medium text-muted-foreground line-clamp-1">
                        {card.title}
                      </span>
                      <div className={cn("flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg", card.bg)}>
                        <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", card.color)} />
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-3">
                      <div className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground">
                        {card.value}
                      </div>
                      <p className="mt-0.5 text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1">{card.desc}</p>
                    </div>
                  </>
                )}
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Chart Section */}
      <Card className="border-border/80 shadow-2xs overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 pb-2">
          <CardTitle className="text-sm sm:text-base font-semibold">Aktivitas Lost & Found (6 Bulan Terakhir)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Perbandingan tren laporan kehilangan, barang temuan terdaftar, dan barang yang berhasil diserahkan kembali.
          </p>
        </CardHeader>
        <CardContent className="p-2 sm:p-5 pt-2">
          <div className="h-60 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} className="stroke-border/60" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="lost" name="Barang Hilang" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="found" name="Barang Temuan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returned" name="Berhasil Dikembalikan" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Grids */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Lost Reports */}
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-border/50">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Laporan Kehilangan Terkini</CardTitle>
              <p className="text-xs text-muted-foreground">Laporan terbaru yang masuk ke sistem</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Link href="/dashboard/lost-found/lost">
                Semua <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 p-3 sm:p-5 pt-3">
            {data.recentLost.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Belum ada laporan kehilangan.</p>
            ) : (
              data.recentLost.map((item) => {
                const statusInfo = lostStatusInfo(item.status);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-card/60 hover:bg-card p-3 space-y-2 transition-all hover:border-primary/40 hover:shadow-2xs"
                  >
                    {/* Top Row: Ticket Code & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                          {item.ticketNumber}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.category}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0 font-medium px-2 py-0.5 whitespace-nowrap",
                          statusInfo.className
                        )}
                      >
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Middle Row: Item Name (Primary Heading) */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {item.itemName}
                      </h4>
                    </div>

                    {/* Bottom Row: Metadata with Icons (Location, Date, Reporter) */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <div className="inline-flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                        <span className="truncate">{item.lastLocation}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {item.user?.name && (
                        <div className="inline-flex items-center gap-1 shrink-0">
                          <User className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{item.user.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent Found Items */}
        <Card className="border-border/80 shadow-2xs overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3.5 sm:p-5 pb-2 sm:pb-3 border-b border-border/50">
            <div>
              <CardTitle className="text-sm sm:text-base font-semibold">Barang Temuan Terkini</CardTitle>
              <p className="text-xs text-muted-foreground">Inventaris fisik barang temuan yang diterima</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <Link href="/dashboard/lost-found/found">
                Katalog <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2.5 p-3 sm:p-5 pt-3">
            {data.recentFound.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Belum ada barang temuan terdaftar.</p>
            ) : (
              data.recentFound.map((item) => {
                const isExpired = Boolean(
                  (item.expiredAt && new Date(item.expiredAt).getTime() < Date.now() && item.status !== "RETURNED" && item.status !== "DISPOSED") ||
                  item.status === "EXPIRED"
                );
                const statusInfo = foundStatusInfo(item.status);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-card/60 hover:bg-card p-3 space-y-2 transition-all hover:border-primary/40 hover:shadow-2xs"
                  >
                    {/* Top Row: Item Code & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                          {item.itemCode}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isExpired && (
                          <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs">
                            Expired
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 whitespace-nowrap",
                            statusInfo.className
                          )}
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>

                    {/* Middle Row: Item Name (Primary Heading) */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {item.itemName}
                      </h4>
                    </div>

                    {/* Bottom Row: Metadata with Icons (Location, Date, Expired) */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <div className="inline-flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                        <span className="truncate">Ditemukan di: {item.foundLocation}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 shrink-0">
                        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/80" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {item.expiredAt && (
                        <div className="inline-flex items-center gap-1 shrink-0 text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            Kedaluwarsa:{" "}
                            {new Date(item.expiredAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

