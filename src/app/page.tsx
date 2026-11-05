import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/ui/app-logo";
import { siteConfig } from "@/config/site";
import {
  LayoutDashboard,
  HandCoins,
  ShieldCheck,
  Package,
  Sparkles,
  Camera,
  CheckCircle2,
  Lock,
  Search,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-background text-foreground">
      {/* Ambient Blue & Ice-White Background Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60 dark:opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 50% -15%, oklch(0.92 0.05 262 / 0.7) 0%, transparent 65%),
            radial-gradient(ellipse 50% 40% at 95% 35%, oklch(0.95 0.03 220 / 0.5) 0%, transparent 50%),
            radial-gradient(ellipse 60% 45% at 5% 75%, oklch(0.94 0.03 260 / 0.4) 0%, transparent 55%)
          `,
        }}
      />

      {/* Decorative Subtle Grid Lines */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* 1. TOP NAVBAR: Tombol-tombol dipindahkan rapi ke Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          {/* Logo Customizable di kiri atas */}
          <AppLogo
            size="md"
            subtitle="Operational Platform"
            className="transition-transform hover:scale-[1.01]"
          />

          {/* Navigasi Aksi: Tombol-tombol utama berada di navbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 px-3.5 text-xs font-semibold rounded-lg border-border/80 bg-card/80 hover:bg-muted/80 backdrop-blur-sm gap-1.5 transition-all shadow-2xs"
            >
              <Link href="/pinjam">
                <HandCoins className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Ajukan</span> Peminjaman
              </Link>
            </Button>

            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Link href="/login">Masuk Akun</Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="h-9 px-4 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25 gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Buka Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* 2. HERO CONTENT: Perpaduan Teks Informasi & Visual Mockup */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-10 sm:py-14 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* SISI KIRI: Informasi Teks & Penonjolan WahSys */}
          <div className="lg:col-span-5 space-y-6 text-left">
            {/* Badge Status */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary shadow-xs backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tracking-wide uppercase text-[10px] font-semibold">Sistem Terpadu Operasional</span>
            </div>

            {/* Nama Sistem WahSys Ditonjolkan */}
            <div>
              <h1
                className="text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl leading-[1.05]"
                style={{ fontFamily: "var(--font-display), serif" }}
              >
                <span className="bg-gradient-to-r from-blue-950 via-primary to-blue-600 bg-clip-text text-transparent">
                  {siteConfig.name}
                </span>
              </h1>
              <p className="mt-2 text-base sm:text-lg font-medium text-primary/90 tracking-wide">
                {siteConfig.tagline}
              </p>
            </div>

            {/* Penjelasan Sederhana Menyeluruh */}
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground font-normal">
              {siteConfig.description}
            </p>

            {/* Micro Highlights yang Rapi & Minimalis */}
            <div className="pt-2 space-y-3 border-t border-border/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Inventaris & Sirkulasi Peminjaman</p>
                  <p className="text-[11px] text-muted-foreground">Pencatatan aset, QR scanner, dan sirkulasi peminjaman digital.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Lost & Found Terpadu</p>
                  <p className="text-[11px] text-muted-foreground">Pelaporan kehilangan, katalog temuan, dan serah terima terverifikasi.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Keamanan & Audit Trail</p>
                  <p className="text-[11px] text-muted-foreground">Perekaman jejak seluruh aktivitas untuk akuntabilitas operasional.</p>
                </div>
              </div>
            </div>

            {/* Quick Action Link */}
            <div className="pt-1">
              <Link
                href="/pinjam"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline group"
              >
                <span>Ajukan peminjaman barang publik sekarang</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          {/* SISI KANAN: Visual UI Mockup / Gambar yang Menyatu Elegan */}
          <div className="lg:col-span-7 relative">
            {siteConfig.heroImageUrl ? (
              /* Opsi Jika User Memasang Gambar Kustom Sendiri */
              <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl shadow-primary/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={siteConfig.heroImageUrl}
                  alt={siteConfig.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              /* Visual Mockup UI Representatif Berpadu Biru & Putih */
              <div className="relative">
                {/* Floating Badge Kiri Bawah: Lost & Found (Efek Mengambang Independen) */}
                <div className="absolute -left-4 -bottom-4 z-20 hidden sm:flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-lg shadow-primary/10 backdrop-blur-md animate-float-bottom">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-primary">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">Lost & Found Terpadu</p>
                    <p className="text-[9px] text-muted-foreground">Pencocokan Cerdas & Klaim Temuan</p>
                  </div>
                </div>

                {/* Floating Badge Kanan Atas: QR & OCR Scanner (Efek Mengambang Independen) */}
                <div className="absolute -right-3 -top-3 z-20 hidden sm:flex items-center gap-2 rounded-xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-lg shadow-primary/10 backdrop-blur-md animate-float-top">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Camera className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-left">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">QR & OCR Scanner</p>
                    <p className="text-[9px] text-muted-foreground">Identifikasi Label Aset Cepat</p>
                  </div>
                </div>

                {/* Main Window Frame Container (Efek Mengambang Utama Lembut) */}
                <div className="relative rounded-2xl border border-border/80 bg-card/90 shadow-2xl shadow-primary/10 backdrop-blur-md overflow-hidden transition-all duration-300 hover:shadow-primary/20 animate-float-slow">
                  {/* Window Bar Header */}
                  <div className="flex h-10 items-center justify-between border-b border-border/60 bg-muted/40 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/60 px-3 py-0.5 text-[10px] font-mono text-muted-foreground">
                      <span className="text-primary font-semibold">https://</span>wahsys.internal/dashboard
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  </div>

                  {/* Window Content Body: Visual Dashboard Preview */}
                  <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-card via-card to-background/50 text-left">
                    {/* Top Micro Stat Cards */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-2xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-medium">Total Aset</span>
                          <Package className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="mt-1 text-base sm:text-lg font-bold text-foreground">1,248</p>
                        <span className="text-[9px] text-emerald-600 font-medium">+14 unit baru</span>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-2xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-medium">Pinjaman Aktif</span>
                          <HandCoins className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <p className="mt-1 text-base sm:text-lg font-bold text-foreground">32</p>
                        <span className="text-[9px] text-blue-600 font-medium">96% tepat waktu</span>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-2xs">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="text-[10px] font-medium">Lost & Found</span>
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                        <p className="mt-1 text-base sm:text-lg font-bold text-foreground">94%</p>
                        <span className="text-[9px] text-amber-600 font-medium">Tingkat kembali</span>
                      </div>
                    </div>

                    {/* Visual Operational Flow Chart (Minimalist Vector Wave) */}
                    <div className="rounded-xl border border-border/60 bg-background/90 p-4 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-foreground">Sirkulasi & Aktivitas Operasional</span>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">
                          Real-time Sync
                        </span>
                      </div>

                      {/* Vector Wave Graph Illustration */}
                      <div className="pt-3">
                        <svg viewBox="0 0 400 90" fill="none" className="w-full h-16 sm:h-20 overflow-visible">
                          <defs>
                            <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Shaded Area */}
                          <path
                            d="M0,60 C40,45 80,75 130,40 C180,10 230,55 280,30 C330,10 370,40 400,20 L400,90 L0,90 Z"
                            fill="url(#waveGradient)"
                          />
                          {/* Accent Line */}
                          <path
                            d="M0,60 C40,45 80,75 130,40 C180,10 230,55 280,30 C330,10 370,40 400,20"
                            stroke="var(--color-primary)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          {/* Key Data Points */}
                          <circle cx="130" cy="40" r="3.5" fill="var(--color-primary)" className="animate-pulse" />
                          <circle cx="280" cy="30" r="3.5" fill="var(--color-primary)" />
                          <circle cx="400" cy="20" r="3.5" fill="var(--color-primary)" />
                        </svg>
                        <div className="flex justify-between text-[9px] font-medium text-muted-foreground pt-1">
                          <span>Senin</span>
                          <span>Selasa</span>
                          <span>Rabu</span>
                          <span>Kamis</span>
                          <span>Jumat</span>
                        </div>
                      </div>
                    </div>

                    {/* Micro Table List Sample */}
                    <div className="rounded-xl border border-border/60 bg-background/80 overflow-hidden text-xs">
                      <div className="flex items-center justify-between px-3.5 py-2 bg-muted/30 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <span>Aset / Aktivitas Terkini</span>
                        <span>Status</span>
                      </div>
                      <div className="divide-y divide-border/40 text-[11px]">
                        <div className="flex items-center justify-between px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-primary text-[10px]">💻</span>
                            <span className="font-medium text-foreground">MacBook Pro M3 Max</span>
                          </div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Tersedia</span>
                        </div>
                        <div className="flex items-center justify-between px-3.5 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 text-[10px]">📷</span>
                            <span className="font-medium text-foreground">Sony Alpha A7 IV</span>
                          </div>
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600">Dipinjam</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 3. FOOTER MINIMALIS */}
      <footer className="relative z-10 w-full border-t border-border/40 bg-card/40 backdrop-blur-sm py-4">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-6 sm:px-8 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Hak cipta dilindungi.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Sistem Operasional Aktif
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
