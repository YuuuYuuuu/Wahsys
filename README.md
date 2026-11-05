# WahSys

Aplikasi web internal terintegrasi untuk mendukung operasional kantor: inventaris aset/barang dengan scanner QR & OCR, peminjaman barang, pengajuan lembur & cetak PDF, penyimpanan rahasia (*credential vault*) terenkripsi client-side, pengaturan email SMTP transaksional, manajemen pengguna berbasis hirarki organisasi, jejak audit (*audit logs*), serta pengelolaan pelaporan dan penemuan barang hilang (*Lost and Found Management Module*).

---

## 🚀 Tech Stack Terbaru

WahSys dibangun menggunakan ekosistem teknologi modern berbasis TypeScript dengan fokus pada performa, keamanan, dan keandalan operasional:

### Core Framework & Bahasa
- **Next.js 15 (App Router)**: Framework React full-stack dengan bundling super cepat menggunakan **Turbopack** (`next dev --turbopack`).
- **React 19**: Versi React terkini dengan optimalisasi server/client rendering dan concurrent features.
- **TypeScript 5.8**: Type safety penuh dari front-end hingga database queries.

### Tampilan & Komponen UI
- **Tailwind CSS v4**: Versi Tailwind terbaru berbasis `@tailwindcss/postcss` dengan engine CSS berkinerja tinggi.
- **Radix UI Primitives**: Komponen UI headless yang aksesibel (Dialog, Dropdown, Tabs, Alert Dialog, Select, Avatar, dll).
- **Lucide React**: Icon pack modern dan ringan.
- **Class Variance Authority (CVA) & clsx / tailwind-merge**: Pengelolaan variant komponen yang konsisten dan modular.
- **Unified Header Portal**: Arsitektur navigasi header terpadu via `<HeaderActions>` yang menempatkan tombol aksi (tambah, ekspor CSV, filter, segmented control) langsung di bar atas secara konsisten di seluruh modul dashboard.

### Manajemen State & Data Fetching
- **TanStack Query v5 (@tanstack/react-query)**: Server-state synchronization, background refetching, query caching, dan optimistic updates.
- **Zustand v5**: Client-state management yang ringan untuk manajemen status otentikasi (`auth-store`) dan UI state.

### Database & ORM
- **Prisma ORM v6**: Object-Relational Mapping (ORM) bertipe ketat dengan schema-driven database management.
- **MySQL (v5.7 / v8 / MariaDB / MAMP MySQL)**: Database relasional untuk penyimpanan data operasional.

### Scanner Kamera & Pemrosesan Gambar
- **Tesseract.js v7**: Optical Character Recognition (OCR) client-side untuk membaca kode label aset langsung melalui kamera.
- **jsQR**: Pemindaian dan pembacaan QR Code secara real-time dari stream video browser.
- **qrcode**: Pembuatan dan rendering label QR code internal maupun identitas organisasi.

### Visualisasi Data & Dokumen
- **Recharts v2**: Grafik responsif (Bar, Pie, Charts) untuk visualisasi ringkasan statistik stok barang dan peminjaman.
- **html2pdf.js**: Pembangkitan dokumen PDF langsung di browser untuk surat perintah lembur dan dokumen label aset.

### Keamanan, Enkripsi, & Otentikasi
- **JWT (JSON Web Token)**: Dual-token auth dengan Access Token berdurasi pendek (15 menit) dan Refresh Token terotasi di database dengan enkripsi hash (Bcrypt + Pepper).
- **Zero-Knowledge Vault Encryption (Client-Side)**: Penyimpanan kredensial sensitif dienkripsi di browser sebelum dikirim ke server menggunakan **Web Crypto API (AES-GCM 256-bit + PBKDF2 derivasi key)**. Server tidak pernah menerima atau menyimpan passphrase master.
- **Server-Side Encryption (AES-256-GCM)**: Mengamankan password SMTP di database menggunakan kunci enkripsi `SMTP_CREDENTIALS_KEY`.
- **Zod v3**: Skema validasi data request di seluruh endpoint API.
- **Rate Limiting**: Dukungan **Upstash Redis (@upstash/ratelimit)** untuk distributed rate limiting, dengan fallback in-memory untuk lingkungan lokal.

### Storage & Integrasi Layanan
- **AWS S3 SDK v3 (@aws-sdk/client-s3)**: Penyimpanan objek fleksibel (mendukung AWS S3, Cloudflare R2, MinIO) dengan fallback penyimpanan lokal (`public/uploads`) bila S3 tidak diaktifkan.
- **Nodemailer v6**: Pengiriman email transaksional berbasis SMTP untuk persetujuan peminjaman, penolakan, dan pengingat jatuh tempo.
- **Pino v9**: Structured logging dengan performa tinggi.

---

## 👥 Peran Pengguna & Hak Akses

| Peran Sistem | Akses Modul |
|---|---|
| **ADMIN** | Memiliki akses penuh ke seluruh menu: Ringkasan, Inventory, Peminjaman, Lembur, Kinerja (semua laporan), Credential Vault, Email & SMTP, Pengguna & Hirarki, Audit Log, serta Lost & Found (Verifikasi laporan, pengelolaan barang temuan, peninjauan klaim & rahasia, serah terima, laporan analitik & ekspor). |
| **PETUGAS** | Ringkasan, Inventory, Peminjaman, Lembur, serta Lost & Found (Verifikasi laporan kehilangan, input temuan fisik, kelola penyimpanan, proses klaim & serah terima). Jika di-assign peran organisasi di Kinerja, dapat mengakses modul Kinerja sesuai perannya. |
| **USER / CIVITAS** | Pelaporan kehilangan mandiri, melihat katalog publik barang temuan, dan mengajukan klaim kepemilikan barang. |

### Hirarki Organisasi (Modul Kinerja)
- **STAFF** (IT, Humas, Akademik, Support): Membuat, mengedit draf, dan mengajukan laporan aktivitas harian/mingguan sendiri.
- **KEPALA_SEKSI**: Meninjau laporan dari staf bawahan langsung, memberikan catatan review, serta mengakses **Ringkasan Meeting** (`/dashboard/kinerja/meeting`).
- **ADMIN**: Dapat mengonfigurasi penugasan hirarki pegawai (di menu Pengguna) dan memantau seluruh laporan kerja unit.

---

## 📂 Modul Aplikasi

1. **Ringkasan (`/dashboard`)**: Metrik ringkas jenis aset, total unit stok, peminjaman aktif, barang menipis, dan pinjaman mendekati jatuh tempo.
2. **Inventory (`/dashboard/inventory`)**:
   - Manajemen katalog aset & non-aset, stok, kategori dengan kebijakan pinjam (*loanable/not-loanable*), lokasi, serta riwayat perawatan & kondisi.
   - Fitur **Scan Label Aset** (kombinasi QR scanner + OCR Tesseract.js) untuk membaca label fisik dalam 1 kali jepret.
   - Tampilan fleksibel (*Grid/Kartu* atau *Tabel*) dan ekspor CSV data aset.
3. **Peminjaman (`/dashboard/loans`)**:
   - Pengelolaan sirkulasi pinjam barang: persetujuan admin, konfirmasi email, pengembalian barang, dan penolakan.
   - Form publik di **`/pinjam`** bagi peminjam umum.
4. **Lembur (`/dashboard/lembur`)**: Form surat perintah lembur (Mode Full / Cepat), kalkulasi otomatis jam lembur, pratinjau real-time, ekspor PDF surat resmi, pengiriman email, serta riwayat pengajuan.
5. **Credential Vault (`/dashboard/vault`)**: Brankas kredensial terenkripsi end-to-end (AES-GCM), kontrol intipan *hold-to-reveal*, auto-lock 10 menit, dan penyimpanan lampiran file terenkripsi.
6. **Pengaturan Email (`/dashboard/pengaturan-email`)**: Pengaturan kredensial server SMTP, pengujian kirim email (*live test*), dan template email kustom berbasis variabel placeholder dinamis.
7. **Pengguna (`/dashboard/users`)**: Manajemen akun, persetujuan akun pendaftar publik, pengaturan role sistem, dan pembagian hirarki atasan-bawahan (*Kepala Seksi & Staff*).
8. **Audit Log (`/dashboard/audit`)**: Perekaman jejak audit sistem (login, mutasi data, reveal kredensial, alamat IP).
9. **Lost & Found Management (`/dashboard/lost-found`)**:
   - **Ringkasan / Dashboard (`/dashboard/lost-found`)**: Metrik status laporan kehilangan vs temuan, rasio pengembalian (*return rate*), rata-rata hari klaim, tren bulanan interaktif (Recharts), dan tabel aktivitas terbaru.
   - **Laporan Kehilangan (`/dashboard/lost-found/lost`)**: Form pelaporan kehilangan barang oleh civitas, verifikasi/penolakan petugas dengan alasan, dan engine pencocokan otomatis (*rule-based matching engine*) dengan skor persentase kandidat barang temuan.
   - **Katalog Barang Temuan (`/dashboard/lost-found/found`)**: Registrasi fisik barang temuan (kode unik `FND-YYYYMM-XXX`), pemisahan deskripsi publik dan deskripsi rahasia (*private description* / identitas rahasia), penandaan lokasi rak penyimpanan fisik, dan toggle tampilan Grid/Tabel.
   - **Detail Barang Temuan (`/dashboard/lost-found/found/[id]`)**: Tampilan komprehensif barang temuan, penyingkapan catatan privat khusus petugas/admin, dan pengajuan klaim pemilik.
   - **Manajemen Klaim (`/dashboard/lost-found/claims`)**: Peninjauan bukti kepemilikan dan verifikasi ciri khusus privat, persetujuan jadwal pengambilan (*pickup appointment*), atau penolakan berdasar alasan terverifikasi.
   - **Serah Terima / Handover (`/dashboard/lost-found/handovers`)**: Dokumentasi penyerahan barang resmi dengan pencatatan nomor identitas (KTP/KTM/NIP), foto serah terima fisik, dan pemutakhiran status barang menjadi *RETURNED*.
   - **Laporan & Ekspor CSV (`/dashboard/lost-found/reports`)**: Metrik efektivitas pengembalian, grafik distribusi kategori barang, serta tombol ekspor CSV untuk Laporan Kehilangan, Barang Temuan, Klaim, dan Dokumen Serah Terima.

---

## 🌐 Rute URL Utama

| Tujuan | Rute URL | Akses |
|---|---|---|
| **Login** | `/login` | Publik |
| **Registrasi** | `/register` | Publik (jika `ALLOW_PUBLIC_REGISTER="true"`) |
| **Form Pinjam Publik** | `/pinjam` | Publik |
| **Scan Publik / Mobile** | `/scan/[assetCode]` | Publik (update memerlukan login) |
| **Dashboard Ringkasan** | `/dashboard` | Login (Admin / Petugas) |
| **Inventory** | `/dashboard/inventory` | Login (Admin / Petugas) |
| **Detail Barang** | `/dashboard/inventory/[id]` | Login (Admin / Petugas) |
| **Peminjaman** | `/dashboard/loans` | Login (Admin / Petugas) |
| **Lembur** | `/dashboard/lembur` | Login (Admin / Petugas) |
| **Kinerja** | `/dashboard/kinerja` | Login (Admin / Petugas ber-organisasi) |
| **Ringkasan Meeting** | `/dashboard/kinerja/meeting` | Admin & Kepala Seksi |
| **Lost & Found - Ringkasan** | `/dashboard/lost-found` | Login (Admin / Petugas / Pengguna) |
| **Lost & Found - Laporan Kehilangan** | `/dashboard/lost-found/lost` | Login (Admin / Petugas / Pengguna) |
| **Lost & Found - Katalog Temuan** | `/dashboard/lost-found/found` | Login (Admin / Petugas / Pengguna) |
| **Lost & Found - Detail Barang Temuan** | `/dashboard/lost-found/found/[id]` | Login (Admin / Petugas / Pengguna) |
| **Lost & Found - Manajemen Klaim** | `/dashboard/lost-found/claims` | Login (Admin / Petugas) |
| **Lost & Found - Serah Terima Barang** | `/dashboard/lost-found/handovers` | Login (Admin / Petugas) |
| **Lost & Found - Laporan & Ekspor** | `/dashboard/lost-found/reports` | Login (Admin / Petugas) |
| **Credential Vault** | `/dashboard/vault` | Hanya Admin |
| **Pengaturan Email** | `/dashboard/pengaturan-email` | Hanya Admin |
| **Manajemen Pengguna** | `/dashboard/users` | Hanya Admin |
| **Audit Log** | `/dashboard/audit` | Hanya Admin |

---

## 🛠️ Panduan Pengembangan Lokal

### Prasyarat
- **Node.js**: Versi `^20.x` atau `^22.x` (LTS direkomendasikan)
- **NPM**: Versi `^10.x`
- **MySQL / MariaDB**: Dapat menggunakan MAMP, XAMPP, Docker, atau MySQL native (Port default MAMP: `8889`)

### Langkah Instalasi

1. **Clone & Install Dependencies**
   ```bash
   npm install
   ```

2. **Konfigurasi Environment (`.env`)**
   Salin `.env.example` menjadi `.env` dan sesuaikan nilainya:
   ```bash
   cp .env.example .env
   ```
   Pastikan variabel berikut terisi dengan benar:
   ```env
   # MySQL (contoh MAMP port 8889)
   DATABASE_URL="mysql://root:root@127.0.0.1:8889/wahsys"

   # Secret JWT & Refresh Token
   JWT_SECRET="min-32-karakter-acak-rahasia-disini"
   JWT_ACCESS_EXPIRES="15m"
   REFRESH_TOKEN_DAYS="7"
   REFRESH_PEPPER="pepper-acak-untuk-hash-refresh-token"
   ALLOW_PUBLIC_REGISTER="true"
   NODE_ENV="development"

   # Kunci enkripsi SMTP server-side (min 16 karakter)
   SMTP_CREDENTIALS_KEY="kunci-hex-atau-string-32-bytes"

   # URL Aplikasi
   APP_URL="http://localhost:3000"
   ```

3. **Sinkronisasi Database dengan Prisma**
   Buat database `wahsys` di MySQL/phpMyAdmin terlebih dahulu, kemudian jalankan:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
   *(Opsional) Masukkan data awal demo:*
   ```bash
   npm run db:seed
   ```
   *Akun demo bawaan seed (password: `Staff123!ChangeMe`):*
   - Kepala Seksi: `kepala@wahsys.local`
   - Staff IT: `staff.it@wahsys.local`
   - Staff Humas: `staff.humas@wahsys.local`
   - Staff Akademik: `staff.akademik@wahsys.local`
   - Staff Support: `staff.support@wahsys.local`

4. **Jalankan Development Server**
   ```bash
   npm run dev
   ```
   Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 📜 Skrip NPM

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Menjalankan server Next.js mode pengembangan dengan Turbopack |
| `npm run dev:clean` | Menghapus cache `.next` dan menjalankan ulang Next.js dev server |
| `npm run build` | Melakukan kompilasi produksi aplikasi |
| `npm run start` | Menjalankan build produksi Next.js |
| `npm run lint` | Menjalankan ESLint untuk memeriksa kualitas kode |
| `npm run db:generate` | Menghasilkan client Prisma (`@prisma/client`) |
| `npm run db:push` | Mendorong perubahan skema `schema.prisma` ke database tanpa file migrasi |
| `npm run db:migrate` | Membuat dan menerapkan migrasi database Prisma (`prisma migrate dev`) |
| `npm run db:seed` | Mengisi data dummy / demo awal ke database |
| `npm run db:import:external-identity` | Mengimpor identitas aset eksternal dari script utilitas |

---

## 🔒 Catatan Keamanan & Operasional

1. **Backup Database**: Lakukan backup berkala pada database MySQL `wahsys`.
2. **Kunci Enkripsi**: Jangan membagikan atau meng-commit `JWT_SECRET`, `REFRESH_PEPPER`, dan `SMTP_CREDENTIALS_KEY` ke repository publik.
3. **Passphrase Master Vault**: Passphrase master vault tidak disimpan di database manapun. Pengguna wajib mengingat passphrase tersebut karena jika hilang, data di dalam vault tidak dapat didekripsi.
4. **Akses Jaringan Scanner (HP / Perangkat Lain)**:
   Jika menggunakan kamera ponsel untuk memindai QR / barcode di jaringan lokal, pastikan mengatur `APP_URL` dan `NEXT_PUBLIC_APP_URL` menggunakan alamat IP lokal komputer Anda (mis. `http://192.168.1.10:3000`), bukan `localhost`. Kamera browser mobile juga memerlukan HTTPS atau pengecualian origin `localhost`/lan di setelan browser.
