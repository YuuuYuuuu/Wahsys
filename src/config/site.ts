/**
 * Konfigurasi Utama Branding & Identitas Situs WahSys
 *
 * Anda dapat menyesuaikan Logo, Favicon/Icon URL, Nama Sistem,
 * dan Deskripsi melalui file ini atau melalui environment variable di `.env`.
 */

export interface SiteConfig {
  /** Nama aplikasi/sistem (default: "WahSys") */
  name: string;
  /** Tagline singkat resmi */
  tagline: string;
  /** Penjelasan ringkas fitur secara keseluruhan */
  description: string;
  /**
   * URL atau path logo aplikasi (misal: "/logo.png", "/images/logo.svg", atau "https://...").
   * Jika bernilai null atau string kosong, sistem akan menggunakan logo emblem vektor WahSys default.
   */
  logoUrl: string | null;
  /**
   * URL atau path favicon / browser tab icon (misal: "/favicon.ico", "/icon.png", atau URL eksternal).
   * Otomatis terpasang pada metadata HTML di seluruh halaman.
   */
  iconUrl: string | null;
  /**
   * URL atau path gambar visual showcase di halaman utama (opsional).
   * Jika null, sistem menampilkan UI mockup grafis vector WahSys default.
   */
  heroImageUrl: string | null;
  /** Tautan navigasi utama */
  links: {
    home: string;
    dashboard: string;
    loans: string;
    login: string;
    register: string;
  };
}

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "WahSys",
  tagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ||
    "Sistem Terpadu Manajemen Operasional & Aset",
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    "Solusi satu pintu pengelolaan operasional internal, inventaris aset, layanan peminjaman umum, dan administrasi kantor secara efisien, aman, dan transparan.",
  // Custom logo: dapat diisi path di folder public (mis. "/logo.png") atau URL eksternal
  logoUrl: process.env.NEXT_PUBLIC_APP_LOGO_URL || null,
  // Custom favicon/icon: dapat diisi path di folder public (mis. "/favicon.ico") atau URL eksternal
  iconUrl: process.env.NEXT_PUBLIC_APP_ICON_URL || null,
  // Custom hero image: dapat diisi path di folder public atau URL eksternal
  heroImageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE || null,
  links: {
    home: "/",
    dashboard: "/dashboard",
    loans: "/pinjam",
    login: "/login",
    register: "/register",
  },
};

