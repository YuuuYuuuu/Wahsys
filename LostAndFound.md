# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## WahSys – Lost and Found Management Module

**Document Version:** 1.0  
**Project:** WahSys – Internal Office Management System  
**Module:** Lost and Found Management  
**Operating Model:** Centralized  
**Platform:** Web Application  
**Database:** Existing WahSys MySQL Database  
**Status:** Proposed Specification

---

# 1. INTRODUCTION

## 1.1 Purpose

Dokumen Software Requirements Specification (SRS) ini bertujuan mendefinisikan kebutuhan fungsional dan non-fungsional untuk pengembangan modul Lost and Found sebagai fitur tambahan pada aplikasi WahSys.

Modul ini dikembangkan untuk mendukung pengelolaan barang hilang dan barang temuan di lingkungan kampus secara terstruktur, terpusat, dan terdokumentasi.

Sistem memungkinkan pengguna untuk:
- Melaporkan barang yang hilang.
- Melaporkan barang yang ditemukan.
- Melihat katalog barang temuan.
- Mengajukan klaim kepemilikan barang.
- Memantau status laporan dan klaim.

Sementara itu, petugas pengelola dapat melakukan:
- Verifikasi laporan.
- Registrasi barang temuan.
- Pengelolaan inventaris barang temuan.
- Verifikasi klaim kepemilikan.
- Pengelolaan proses pengembalian barang.
- Monitoring dan pembuatan laporan operasional.

## 1.2 Scope

Pengembangan Lost and Found merupakan penambahan modul baru pada WahSys, bukan pembangunan aplikasi terpisah.

Modul harus terintegrasi dengan infrastruktur yang sudah tersedia.

**In Scope:**
1. Lost Item Reporting.
2. Found Item Reporting.
3. Found Item Management.
4. Item Matching.
5. Claim Management.
6. Claim Verification.
7. Item Handover Management.
8. Notification Management.
9. Lost and Found Dashboard.
10. Operational Reporting.
11. Audit Trail Integration.

**Out of Scope (Initial Release):**
1. Aplikasi mobile native Android/iOS.
2. Integrasi dengan sistem akademik kampus.
3. Integrasi dengan sistem kartu identitas atau RFID.
4. Automatic ownership verification menggunakan AI.
5. Multi-campus atau multi-tenant management.
6. Sistem pelelangan atau penjualan barang tidak diklaim.
7. Integrasi WhatsApp API.

## 1.3 Product Positioning

Lost and Found akan menjadi modul baru di dalam WahSys Dashboard dengan memanfaatkan infrastruktur aplikasi yang telah tersedia.

Modul tidak diperbolehkan membuat authentication service, database connection, email service, atau sistem manajemen pengguna yang terpisah.

## 1.4 Definitions

| Istilah | Definisi |
|---|---|
| Lost Item | Barang yang dilaporkan hilang |
| Found Item | Barang yang ditemukan dan dilaporkan |
| Finder | Pengguna yang menemukan barang |
| Claimant | Pengguna yang mengajukan kepemilikan barang |
| L&F Admin | Petugas pengelola barang hilang dan temuan |
| Claim | Pengajuan kepemilikan barang |
| Handover | Proses penyerahan barang kepada pemilik |
| Matching | Proses pencocokan laporan kehilangan dengan barang temuan |
| Ticket Number | Nomor identifikasi unik laporan |
| Item Code | Nomor identifikasi unik inventaris barang temuan |

---

# 2. SYSTEM OVERVIEW

## 2.1 Existing System Architecture

WahSys merupakan aplikasi web internal yang menggunakan arsitektur full-stack berbasis Next.js.

Modul Lost and Found harus mengikuti teknologi yang sudah digunakan.

| Layer | Existing Technology | Implementation |
|---|---|---|
| Framework | Next.js 15 App Router | Routing dan server-side application |
| Frontend | React 19 | User interface |
| Language | TypeScript 5.8 | Application logic |
| Styling | Tailwind CSS v4 | Styling |
| UI Components | Radix UI | Dialog, Select, Tabs, Dropdown |
| State Management | Zustand v5 | Client-side state |
| Data Fetching | TanStack Query v5 | Data synchronization dan caching |
| ORM | Prisma ORM v6 | Database access |
| Database | MySQL | Data persistence |
| Authentication | JWT Dual Token | Existing authentication |
| Validation | Zod v3 | Request dan form validation |
| Email | Nodemailer v6 | Email notifications |
| File Storage | AWS S3 SDK v3 | Foto dan dokumen |
| Logging | Pino v9 | Application logging |
| Audit | Existing Audit Log | Activity tracking |
| Chart | Recharts v2 | Dashboard analytics |

Tidak diperkenankan menambahkan framework backend terpisah seperti Express.js hanya untuk modul Lost and Found.

## 2.2 Integration with Existing WahSys

Modul Lost and Found harus mengintegrasikan komponen berikut:

| Existing Component | Integration Requirement |
|---|---|
| Authentication | Menggunakan sistem login WahSys |
| User Management | Menggunakan data pengguna yang sudah tersedia |
| Role Management | Menggunakan role dan permission existing |
| Prisma | Menambahkan model baru pada schema existing |
| MySQL | Menggunakan database WahSys yang sama |
| SMTP | Menggunakan konfigurasi email existing |
| File Storage | Menggunakan mekanisme S3 atau local fallback existing |
| Audit Log | Merekam aktivitas modul Lost and Found |
| Dashboard | Mengikuti struktur dashboard existing |

**Integration Principle:** Semua perubahan harus bersifat additive. Jangan mengganti, menghapus, atau merombak modul Inventory, Peminjaman, Lembur, Kinerja, Credential Vault, maupun Pengguna.

## 2.3 Proposed Navigation

Modul baru ditambahkan pada navigasi dashboard WahSys.

Struktur menu yang diusulkan:

- Dashboard
- Inventory
- Peminjaman
- Lembur
- **Lost and Found**
  - Overview
  - Lost Reports
  - Found Items
  - Claims
  - Handovers
  - Reports

Menu tambahan ini harus mengikuti mekanisme navigasi dan komponen header terpadu WahSys.

---

# 3. USER AND ACCESS REQUIREMENTS

## 3.1 User Roles

SRS ini menggunakan dua role sistem existing sebagai dasar integrasi.

### ADMIN
Memiliki akses penuh terhadap seluruh fitur Lost and Found.

Hak akses:
- Melihat seluruh laporan.
- Memverifikasi laporan kehilangan.
- Memverifikasi barang temuan.
- Mengelola barang temuan.
- Mengelola klaim.
- Menyetujui atau menolak klaim.
- Mengelola serah terima.
- Melihat dashboard dan laporan.
- Melihat audit log.

### PETUGAS
Berfungsi sebagai operator pengelolaan Lost and Found sesuai kewenangan yang diberikan.

Hak akses yang diusulkan:
- Melihat laporan.
- Memverifikasi laporan.
- Mengelola barang temuan.
- Mengelola penyimpanan.
- Memeriksa klaim.
- Melaksanakan serah terima.
- Melihat laporan operasional.

Pembatasan akses PETUGAS harus mengikuti mekanisme otorisasi existing. Jangan membuat role sistem baru tanpa kebutuhan dan persetujuan.

### Campus User

Campus User adalah mahasiswa, dosen, staff, atau pengguna kampus lainnya yang dapat membuat laporan dan mengajukan klaim.

Kebutuhan akses Campus User perlu disesuaikan dengan kebijakan akun WahSys.

Untuk versi awal, direkomendasikan menggunakan akun yang telah terdaftar pada sistem. Apabila mahasiswa atau pengunjung belum memiliki akun WahSys, diperlukan keputusan terpisah mengenai akses publik atau integrasi identitas kampus.

## 3.2 Access Control Matrix

| Feature | ADMIN | PETUGAS | CAMPUS USER |
|---|:---:|:---:|:---:|
| View Dashboard | ✓ | ✓ | – |
| Submit Lost Report | ✓ | ✓ | ✓ |
| Submit Found Report | ✓ | ✓ | ✓ |
| Browse Found Items | ✓ | ✓ | ✓ |
| View Own Reports | ✓ | ✓ | ✓ |
| View All Reports | ✓ | ✓ | – |
| Verify Reports | ✓ | ✓* | – |
| Manage Found Items | ✓ | ✓* | – |
| Submit Claim | ✓ | ✓ | ✓ |
| Verify Claim | ✓ | ✓* | – |
| Manage Handover | ✓ | ✓* | – |
| View Analytics | ✓ | ✓* | – |
| Manage Configuration | ✓ | – | – |

Keterangan: ✓* mengikuti kewenangan PETUGAS yang diberikan oleh administrator.

---

# 4. FUNCTIONAL REQUIREMENTS

## FR-01: Lost Item Reporting

**Description:** Sistem harus menyediakan fasilitas pelaporan barang hilang.

Requirements:

- FR-01.1: User dapat membuat laporan kehilangan melalui formulir Lost Report.
- FR-01.2: Sistem menyediakan field nama barang.
- FR-01.3: Sistem menyediakan pilihan kategori barang.
- FR-01.4: User dapat memasukkan deskripsi barang.
- FR-01.5: User dapat memasukkan lokasi terakhir barang terlihat.
- FR-01.6: User dapat memasukkan tanggal dan waktu kehilangan.
- FR-01.7: User dapat mengunggah foto pendukung.
- FR-01.8: Sistem menghasilkan ticket number secara otomatis.
- FR-01.9: Sistem menyimpan ID pengguna pembuat laporan.
- FR-01.10: Sistem memberikan status awal SUBMITTED.
- FR-01.11: User dapat melihat riwayat laporan miliknya.
- FR-01.12: User dapat membatalkan laporan selama belum diselesaikan.

**Required Fields:**

| Field | Type | Mandatory |
|---|---|---|
| Item Name | Text | Yes |
| Category | Select | Yes |
| Description | Textarea | Yes |
| Last Seen Location | Select/Text | Yes |
| Lost Date | Date | Yes |
| Lost Time | Time | Yes |
| Item Photo | Image | Optional |
| Additional Notes | Textarea | Optional |

## FR-02: Found Item Reporting

**Description:** Sistem menyediakan fasilitas pelaporan barang yang ditemukan.

Requirements:

- FR-02.1: User dapat membuat laporan barang temuan.
- FR-02.2: User mengisi nama dan kategori barang.
- FR-02.3: User mengisi lokasi dan waktu penemuan.
- FR-02.4: User dapat mengunggah foto barang.
- FR-02.5: Sistem menghasilkan ticket number.
- FR-02.6: Sistem menyimpan identitas finder.
- FR-02.7: Sistem mencatat status penyerahan barang.
- FR-02.8: Sistem membedakan laporan barang temuan dengan inventaris fisik yang sudah diterima admin.
- FR-02.9: Barang tidak boleh berstatus AVAILABLE sebelum diterima dan diregistrasi oleh admin.
- FR-02.10: User menerima notifikasi mengenai proses penerimaan barang.

## FR-03: Lost and Found Verification

**Description:** Admin melakukan verifikasi terhadap laporan yang masuk.

Requirements:

- FR-03.1: Admin dapat melihat daftar laporan baru.
- FR-03.2: Admin dapat melihat detail laporan.
- FR-03.3: Admin dapat menyetujui laporan.
- FR-03.4: Admin dapat menolak laporan dengan alasan.
- FR-03.5: Admin dapat meminta informasi tambahan.
- FR-03.6: Sistem mencatat waktu dan pengguna yang melakukan verifikasi.
- FR-03.7: Sistem mengirimkan notifikasi hasil verifikasi.
- FR-03.8: Seluruh perubahan status dicatat.

## FR-04: Found Item Management

**Description:** Admin mengelola barang temuan yang sudah diterima secara fisik.

Requirements:

- FR-04.1: Admin dapat mendaftarkan barang temuan ke inventaris Lost and Found.
- FR-04.2: Sistem menghasilkan item code unik.
- FR-04.3: Admin dapat menentukan lokasi penyimpanan.
- FR-04.4: Admin dapat memperbarui kondisi barang.
- FR-04.5: Admin dapat memperbarui deskripsi internal.
- FR-04.6: Admin dapat melihat riwayat perubahan barang.
- FR-04.7: Admin dapat memindahkan barang ke lokasi penyimpanan lain.
- FR-04.8: Sistem mencegah barang yang sudah RETURNED untuk diklaim kembali.
- FR-04.9: Sistem menampilkan barang tersedia pada katalog publik sesuai kebijakan akses.
- FR-04.10: Informasi kepemilikan atau ciri khusus barang tidak boleh ditampilkan secara publik.

## FR-05: Found Item Catalog

**Description:** Sistem menyediakan katalog barang temuan yang dapat ditelusuri pengguna.

Requirements:

- FR-05.1: User dapat melihat daftar barang temuan yang AVAILABLE.
- FR-05.2: User dapat mencari barang berdasarkan nama.
- FR-05.3: User dapat melakukan filter berdasarkan kategori.
- FR-05.4: User dapat melakukan filter berdasarkan lokasi penemuan.
- FR-05.5: User dapat melihat tanggal penemuan.
- FR-05.6: User dapat melihat foto publik barang.
- FR-05.7: User dapat melihat detail publik barang.
- FR-05.8: User tidak dapat melihat bukti kepemilikan atau deskripsi rahasia.
- FR-05.9: User dapat mengajukan klaim dari halaman detail barang.

## FR-06: Item Matching

**Description:** Sistem melakukan pencocokan antara laporan kehilangan dan barang temuan.

Requirements:

- FR-06.1: Sistem dapat mencocokkan kategori barang.
- FR-06.2: Sistem dapat mencocokkan nama dan kata kunci deskripsi.
- FR-06.3: Sistem dapat membandingkan lokasi kehilangan dan lokasi penemuan.
- FR-06.4: Sistem dapat membandingkan tanggal kehilangan dan penemuan.
- FR-06.5: Sistem menyimpan kandidat matching.
- FR-06.6: Sistem menampilkan hasil matching kepada admin.
- FR-06.7: Admin dapat menandai kandidat sebagai relevant atau irrelevant.
- FR-06.8: Sistem dapat mengirimkan notifikasi apabila terdapat kandidat yang relevan.
- FR-06.9: Matching tidak boleh dianggap sebagai bukti kepemilikan otomatis.
- FR-06.10: Persetujuan kepemilikan tetap dilakukan oleh admin.

Initial matching menggunakan rule-based filtering, bukan AI.

## FR-07: Claim Management

**Description:** Sistem menyediakan mekanisme pengajuan klaim barang temuan.

Requirements:

- FR-07.1: User dapat memilih barang yang akan diklaim.
- FR-07.2: Sistem memastikan barang masih AVAILABLE.
- FR-07.3: User mengisi deskripsi bukti kepemilikan.
- FR-07.4: User dapat mengunggah foto atau dokumen pendukung.
- FR-07.5: Sistem menghasilkan claim number unik.
- FR-07.6: Sistem mencatat claimant.
- FR-07.7: Sistem mengubah status klaim menjadi PENDING_REVIEW.
- FR-07.8: Sistem mengirim notifikasi kepada admin.
- FR-07.9: User dapat melihat status klaim.
- FR-07.10: User dapat memberikan bukti tambahan apabila diminta admin.

## FR-08: Claim Verification

**Description:** Admin memverifikasi validitas kepemilikan barang.

Requirements:

- FR-08.1: Admin dapat melihat seluruh klaim aktif.
- FR-08.2: Admin dapat melihat identitas claimant.
- FR-08.3: Admin dapat melihat bukti pendukung.
- FR-08.4: Admin dapat membandingkan bukti dengan kondisi barang.
- FR-08.5: Admin dapat menyetujui klaim.
- FR-08.6: Admin dapat menolak klaim.
- FR-08.7: Admin dapat meminta bukti tambahan.
- FR-08.8: Sistem menyimpan alasan keputusan.
- FR-08.9: Sistem menyimpan waktu dan identitas reviewer.
- FR-08.10: Satu barang hanya dapat memiliki satu klaim yang disetujui.
- FR-08.11: Ketika klaim disetujui, status barang berubah menjadi RESERVED.
- FR-08.12: Sistem mengirim notifikasi kepada claimant.

## FR-09: Handover Management

**Description:** Sistem mengelola proses penyerahan barang kepada pemilik.

Requirements:

- FR-09.1: Admin dapat membuat jadwal pengambilan.
- FR-09.2: Sistem menyimpan tanggal dan waktu pengambilan.
- FR-09.3: Sistem menyimpan lokasi pengambilan.
- FR-09.4: Admin melakukan pemeriksaan identitas claimant.
- FR-09.5: Admin mencatat proses penyerahan.
- FR-09.6: Sistem dapat menyimpan bukti serah terima.
- FR-09.7: Admin dapat menambahkan catatan pengambilan.
- FR-09.8: Sistem mengubah status barang menjadi RETURNED setelah serah terima selesai.
- FR-09.9: Sistem mengubah status klaim menjadi COMPLETED.
- FR-09.10: Sistem menyimpan identitas petugas yang menyerahkan barang.

## FR-10: Notification Management

**Description:** Sistem mengirimkan notifikasi melalui infrastruktur email WahSys.

Requirements:

- FR-10.1: Sistem mengirim notifikasi setelah laporan dibuat.
- FR-10.2: Sistem mengirim notifikasi ketika laporan disetujui atau ditolak.
- FR-10.3: Sistem mengirim notifikasi apabila terdapat kandidat matching.
- FR-10.4: Sistem mengirim notifikasi setelah klaim diajukan.
- FR-10.5: Sistem mengirim notifikasi ketika klaim disetujui atau ditolak.
- FR-10.6: Sistem mengirim notifikasi jadwal pengambilan.
- FR-10.7: Sistem mengirim konfirmasi setelah barang diserahkan.
- FR-10.8: Pengiriman email menggunakan SMTP existing WahSys.
- FR-10.9: Kegagalan pengiriman email tidak boleh membatalkan transaksi database yang berhasil.

## FR-11: Dashboard and Analytics

**Description:** Sistem menyediakan ringkasan operasional Lost and Found.

Requirements:

- FR-11.1: Sistem menampilkan total laporan kehilangan.
- FR-11.2: Sistem menampilkan total barang temuan.
- FR-11.3: Sistem menampilkan klaim yang menunggu verifikasi.
- FR-11.4: Sistem menampilkan barang yang telah dikembalikan.
- FR-11.5: Sistem menampilkan barang yang belum diklaim.
- FR-11.6: Sistem menampilkan grafik laporan berdasarkan periode.
- FR-11.7: Sistem menampilkan rasio pengembalian barang.
- FR-11.8: Admin dapat melakukan filter berdasarkan rentang tanggal.
- FR-11.9: Admin dapat mengekspor data operasional ke CSV apabila mengikuti mekanisme ekspor existing.

## FR-12: Audit Trail

**Description:** Seluruh aktivitas penting Lost and Found harus dicatat pada audit log WahSys.

Requirements:

- FR-12.1: Sistem mencatat pembuatan laporan.
- FR-12.2: Sistem mencatat perubahan status.
- FR-12.3: Sistem mencatat verifikasi laporan.
- FR-12.4: Sistem mencatat pendaftaran barang.
- FR-12.5: Sistem mencatat pengajuan dan keputusan klaim.
- FR-12.6: Sistem mencatat serah terima.
- FR-12.7: Sistem mencatat identitas pengguna yang melakukan tindakan.
- FR-12.8: Sistem mencatat timestamp dan informasi konteks yang relevan.
- FR-12.9: Audit log tidak boleh dapat diubah atau dihapus melalui antarmuka operasional.

---

# 5. BUSINESS PROCESS REQUIREMENTS

## 5.1 Lost Item Workflow

1. User login ke WahSys.
2. User membuka menu Lost and Found.
3. User memilih Lost Report.
4. User mengisi formulir kehilangan.
5. Sistem melakukan validasi.
6. Sistem membuat ticket number.
7. Admin menerima laporan.
8. Admin melakukan verifikasi.
9. Jika ditolak, sistem mengirimkan alasan penolakan.
10. Jika disetujui, laporan dipublikasikan sebagai laporan aktif.
11. Sistem menjalankan proses matching.
12. User menerima informasi kandidat barang apabila tersedia.

## 5.2 Found Item Workflow

1. User membuka Found Report.
2. User mengisi informasi barang yang ditemukan.
3. Sistem menghasilkan ticket number.
4. Finder menyerahkan barang ke lokasi Lost and Found pusat.
5. Admin menerima dan memeriksa barang.
6. Admin melakukan registrasi inventaris.
7. Sistem menghasilkan item code.
8. Admin menentukan lokasi penyimpanan.
9. Barang berubah menjadi AVAILABLE.
10. Informasi publik barang ditampilkan pada katalog.
11. Sistem melakukan matching dengan laporan kehilangan.

## 5.3 Claim and Handover Workflow

1. User menemukan barang yang sesuai dengan miliknya.
2. User membuka detail barang.
3. User mengajukan klaim.
4. Sistem mencatat klaim.
5. Admin memeriksa bukti kepemilikan.
6. Admin menyetujui, menolak, atau meminta bukti tambahan.
7. Jika disetujui, barang menjadi RESERVED.
8. Admin menentukan jadwal pengambilan.
9. User datang ke kantor Lost and Found.
10. Admin memverifikasi identitas.
11. Admin menyerahkan barang.
12. Sistem menyimpan bukti serah terima.
13. Barang menjadi RETURNED.
14. Klaim menjadi COMPLETED.

---

# 6. DATA REQUIREMENTS

## 6.1 Database Integration Strategy

Seluruh tabel Lost and Found harus ditambahkan ke database MySQL WahSys melalui Prisma ORM.

Prinsip implementasi:

- Tidak membuat database baru.
- Tidak membuat koneksi database terpisah.
- Tidak mengganti konfigurasi DATABASE_URL.
- Menggunakan model User existing sebagai referensi foreign key.
- Mengikuti konvensi penamaan model dan field pada schema Prisma existing.
- Tidak menggandakan data user ke tabel baru.
- Mempertahankan kompatibilitas seluruh modul existing.

## 6.2 Proposed Database Entities

### A. LostReport

Menyimpan laporan kehilangan.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| ticketNumber | String | Nomor laporan unik |
| userId | Existing User ID | Pelapor |
| categoryId | FK | Kategori barang |
| itemName | String | Nama barang |
| description | Text | Deskripsi |
| lastLocationId | FK | Lokasi kehilangan |
| lostAt | DateTime | Waktu kehilangan |
| status | Enum | Status laporan |
| createdAt | DateTime | Waktu dibuat |
| updatedAt | DateTime | Waktu diperbarui |

### B. FoundReport

Menyimpan laporan penemuan barang.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| ticketNumber | String | Nomor laporan |
| finderId | Existing User ID | Pelapor |
| categoryId | FK | Kategori |
| itemName | String | Nama barang |
| publicDescription | Text | Deskripsi publik |
| privateDescription | Text | Deskripsi internal |
| foundLocationId | FK | Lokasi penemuan |
| foundAt | DateTime | Waktu ditemukan |
| receiptStatus | Enum | Status penerimaan |
| status | Enum | Status laporan |
| createdAt | DateTime | Waktu dibuat |

### C. FoundItem

Menyimpan data inventaris fisik barang temuan.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| itemCode | String | Kode inventaris unik |
| foundReportId | FK | Referensi laporan |
| storageLocationId | FK | Lokasi penyimpanan |
| condition | String | Kondisi barang |
| itemStatus | Enum | Status barang |
| receivedBy | Existing User ID | Petugas penerima |
| receivedAt | DateTime | Waktu diterima |
| returnedAt | DateTime | Waktu dikembalikan |

### D. Claim

Menyimpan pengajuan klaim.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| claimNumber | String | Nomor klaim |
| foundItemId | FK | Barang yang diklaim |
| claimantId | Existing User ID | Pemohon |
| ownershipDescription | Text | Keterangan kepemilikan |
| status | Enum | Status klaim |
| reviewedBy | Existing User ID | Admin reviewer |
| reviewedAt | DateTime | Waktu review |
| rejectionReason | Text | Alasan penolakan |
| createdAt | DateTime | Waktu pengajuan |

### E. ClaimEvidence

Menyimpan bukti kepemilikan.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| claimId | FK | Referensi klaim |
| filePath | String | Lokasi file |
| evidenceType | String | Jenis bukti |
| description | Text | Keterangan |
| createdAt | DateTime | Waktu unggah |

### F. ItemMatch

Menyimpan kandidat hasil pencocokan.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| lostReportId | FK | Laporan kehilangan |
| foundItemId | FK | Barang temuan |
| matchScore | Decimal | Skor kecocokan |
| matchStatus | Enum | Status kandidat |
| createdAt | DateTime | Waktu matching |

### G. Handover

Menyimpan transaksi pengembalian barang.

| Field | Type | Description |
|---|---|---|
| id | Int/BigInt | Primary key |
| claimId | FK | Referensi klaim |
| recipientId | Existing User ID | Penerima |
| adminId | Existing User ID | Petugas |
| scheduledAt | DateTime | Jadwal pengambilan |
| handoverAt | DateTime | Waktu aktual |
| proofPath | String | Bukti serah terima |
| notes | Text | Catatan |
| status | Enum | Status serah terima |

### H. Supporting Entities

Entitas tambahan yang direkomendasikan:

- LostFoundCategory
- LostFoundLocation
- StorageLocation
- ClaimReview
- ItemMovement
- HandoverSchedule

Semua relasi ke pengguna harus menggunakan foreign key menuju tabel User existing, setelah struktur model aktual diperiksa.

---

# 7. STATUS MANAGEMENT

## 7.1 Lost Report Status

| Status | Description |
|---|---|
| SUBMITTED | Laporan masuk |
| UNDER_REVIEW | Sedang diverifikasi |
| NEED_MORE_INFO | Membutuhkan informasi tambahan |
| PUBLISHED | Laporan aktif |
| MATCH_FOUND | Kandidat barang ditemukan |
| RESOLVED | Kehilangan terselesaikan |
| REJECTED | Laporan ditolak |
| CANCELLED | Laporan dibatalkan |
| EXPIRED | Masa aktif berakhir |

## 7.2 Found Item Status

| Status | Description |
|---|---|
| PENDING_RECEIPT | Menunggu penyerahan fisik |
| RECEIVED | Barang diterima admin |
| AVAILABLE | Barang tersedia untuk diklaim |
| CLAIM_PENDING | Klaim sedang diproses |
| RESERVED | Klaim disetujui |
| RETURNED | Barang telah dikembalikan |
| UNCLAIMED | Belum diklaim melewati batas waktu |
| DISPOSED | Barang telah ditangani sesuai kebijakan |

## 7.3 Claim Status

| Status | Description |
|---|---|
| SUBMITTED | Klaim diajukan |
| PENDING_REVIEW | Menunggu pemeriksaan |
| NEED_MORE_INFO | Memerlukan bukti tambahan |
| APPROVED | Klaim disetujui |
| REJECTED | Klaim ditolak |
| CANCELLED | Klaim dibatalkan |
| COMPLETED | Serah terima selesai |

## 7.4 Status Transition Rules

1. Barang hanya dapat berubah menjadi AVAILABLE setelah diterima secara fisik dan diregistrasi.
2. Barang AVAILABLE dapat menerima satu atau beberapa pengajuan klaim aktif sesuai kebijakan.
3. Ketika satu klaim disetujui, klaim lain pada barang yang sama harus ditangani sebagai klaim tidak lagi tersedia untuk persetujuan.
4. Barang berubah menjadi RESERVED setelah klaim disetujui.
5. Barang berubah menjadi RETURNED hanya setelah proses serah terima dikonfirmasi.
6. Klaim berubah menjadi COMPLETED setelah handover berhasil.
7. Barang RETURNED tidak boleh kembali ke AVAILABLE tanpa proses koreksi khusus yang tercatat.
8. Setiap perubahan status harus dicatat dalam audit trail.

---

# 8. USER INTERFACE REQUIREMENTS

## 8.1 Navigation Integration

Menu Lost and Found harus ditambahkan ke dashboard WahSys.

Proposed URL:

| Page | Proposed Route |
|---|---|
| Overview | `/dashboard/lost-found` |
| Lost Reports | `/dashboard/lost-found/lost` |
| Found Items | `/dashboard/lost-found/found` |
| Item Detail | `/dashboard/lost-found/found/[id]` |
| Claims | `/dashboard/lost-found/claims` |
| Claim Detail | `/dashboard/lost-found/claims/[id]` |
| Handovers | `/dashboard/lost-found/handovers` |
| Reports | `/dashboard/lost-found/reports` |

User-facing routes dapat dikembangkan sebagai halaman dashboard sesuai mekanisme autentikasi WahSys. Jika dibutuhkan akses publik, route dan aturan akses harus disepakati terlebih dahulu.

## 8.2 UI Design Standards

Seluruh halaman harus mengikuti desain WahSys.

Requirements:

- Menggunakan Tailwind CSS v4.
- Menggunakan Radix UI untuk komponen interaktif.
- Menggunakan Lucide React untuk ikon.
- Mengikuti komponen HeaderActions existing.
- Mengikuti pola tabel, filter, modal, dan form existing.
- Menggunakan responsive layout.
- Menampilkan loading state.
- Menampilkan empty state.
- Menampilkan error state.
- Menggunakan konfirmasi sebelum tindakan kritis.
- Tidak membuat design system baru.

## 8.3 Required Pages

### Page 1: Lost and Found Overview

Menampilkan:
- Total lost reports.
- Total found items.
- Pending claims.
- Returned items.
- Recent activities.
- Grafik barang hilang dan ditemukan.

### Page 2: Lost Reports

Menampilkan:
- Ticket number.
- Item name.
- Category.
- Reporter.
- Location.
- Lost date.
- Status.
- Action.

### Page 3: Found Items

Menampilkan:
- Item code.
- Item name.
- Category.
- Found location.
- Storage location.
- Received date.
- Item status.
- Action.

### Page 4: Claim Management

Menampilkan:
- Claim number.
- Item code.
- Item name.
- Claimant.
- Submission date.
- Verification status.
- Action.

### Page 5: Handover Management

Menampilkan:
- Handover number.
- Claim number.
- Item code.
- Recipient.
- Scheduled date.
- Actual handover date.
- Handover status.

### Page 6: Reports

Menampilkan:
- Lost vs Found Statistics.
- Item Return Rate.
- Unclaimed Items.
- Claim Approval Statistics.
- Processing Time.
- Export CSV.

---

# 9. NON-FUNCTIONAL REQUIREMENTS

## NFR-01: Performance

- Halaman dashboard harus memiliki waktu respons yang wajar.
- Query database harus menggunakan filtering dan pagination.
- Sistem tidak boleh memuat seluruh data laporan sekaligus.
- Data tabel harus menggunakan server-side pagination untuk dataset besar.
- Proses matching harus berjalan secara efisien dan tidak menghambat request utama.

Target awal: 95% request operasional normal selesai dalam waktu maksimal 3 detik pada kondisi beban normal, tidak termasuk upload file besar atau layanan eksternal.

## NFR-02: Security

- Authentication harus menggunakan mekanisme JWT existing.
- Endpoint harus memeriksa authorization berdasarkan role.
- Validasi request menggunakan Zod.
- File upload harus membatasi jenis dan ukuran file.
- File bukti klaim tidak boleh dapat diakses publik.
- Deskripsi internal barang harus dibatasi untuk admin.
- Password tidak boleh disimpan ulang dalam modul.
- Audit trail harus mencatat tindakan sensitif.
- Rate limiting mengikuti infrastruktur existing.
- Tidak boleh memperlihatkan informasi pribadi claimant kepada pengguna lain.

## NFR-03: Data Integrity

- Setiap ticket number harus unik.
- Setiap item code harus unik.
- Foreign key harus menjaga konsistensi relasi.
- Transaksi klaim dan handover harus menggunakan database transaction.
- Satu barang tidak boleh memiliki lebih dari satu klaim APPROVED.
- Status barang dan status klaim harus tetap sinkron.
- Penghapusan data operasional harus dibatasi.

## NFR-04: File Management

- Foto barang dan bukti klaim menggunakan mekanisme storage existing.
- Mendukung AWS S3, Cloudflare R2, MinIO, atau local fallback.
- File disimpan menggunakan identifier unik.
- File bukti klaim harus memiliki akses terbatas.
- Penghapusan record tidak boleh langsung menyebabkan kehilangan bukti audit.

## NFR-05: Maintainability

- Menggunakan TypeScript.
- Mengikuti pola modular existing.
- Menggunakan Prisma ORM.
- Menghindari duplikasi fungsi.
- Menggunakan shared utilities jika tersedia.
- Menambahkan test untuk proses kritis.
- Tidak merusak build modul existing.

## NFR-06: Compatibility

- Kompatibel dengan Next.js 15 App Router.
- Kompatibel dengan React 19.
- Kompatibel dengan Prisma 6.
- Kompatibel dengan MySQL existing.
- Tidak mengubah mekanisme authentication.
- Tidak mengganggu modul yang sudah tersedia.

---

# 10. API AND APPLICATION REQUIREMENTS

Karena WahSys menggunakan Next.js full-stack, API harus mengikuti pola endpoint yang sudah digunakan pada aplikasi.

Berikut proposed API contract. Prefix dan implementasi final harus disesuaikan dengan konvensi API existing.

| Method | Proposed Endpoint | Description |
|---|---|---|
| GET | `/api/lost-found/dashboard` | Dashboard |
| GET | `/api/lost-found/lost` | List lost reports |
| POST | `/api/lost-found/lost` | Create lost report |
| GET | `/api/lost-found/lost/[id]` | Lost report detail |
| PATCH | `/api/lost-found/lost/[id]` | Update report |
| POST | `/api/lost-found/found` | Create found report |
| GET | `/api/lost-found/found` | Found item catalog |
| GET | `/api/lost-found/found/[id]` | Found item detail |
| POST | `/api/lost-found/claims` | Submit claim |
| GET | `/api/lost-found/claims` | Claim list |
| GET | `/api/lost-found/claims/[id]` | Claim detail |
| PATCH | `/api/lost-found/claims/[id]/review` | Review claim |
| POST | `/api/lost-found/handovers` | Create handover |
| PATCH | `/api/lost-found/handovers/[id]/complete` | Complete handover |
| GET | `/api/lost-found/reports` | Operational reports |

All endpoints must:
- Validate incoming requests.
- Check authentication and authorization.
- Handle errors consistently.
- Record important activity.
- Use existing Prisma database client.
- Return consistent response structures.

---

# 11. SYSTEM CONSTRAINTS

1. Lost and Found is an extension of WahSys.
2. Existing user authentication must be reused.
3. Existing role management must be reused.
4. Existing MySQL database must be reused.
5. Existing Prisma configuration must be reused.
6. Existing SMTP configuration must be reused.
7. Existing storage infrastructure must be reused.
8. Existing audit logging must be reused.
9. Existing navigation and design conventions must be followed.
10. Existing modules must remain functional.
11. No separate backend service should be introduced for the initial release.
12. All database modifications must be reviewed before being applied to production.

---

# 12. ACCEPTANCE CRITERIA

Pengembangan dianggap memenuhi kebutuhan apabila seluruh kriteria berikut terpenuhi.

| ID | Acceptance Criteria | Expected Result |
|---|---|---|
| AC-01 | User membuat Lost Report | Laporan tersimpan dan memiliki ticket number |
| AC-02 | User membuat Found Report | Laporan tersimpan |
| AC-03 | Admin memverifikasi laporan | Status berubah sesuai keputusan |
| AC-04 | Admin menerima barang fisik | Item code berhasil dibuat |
| AC-05 | User melihat katalog | Hanya barang yang layak dipublikasikan muncul |
| AC-06 | Sistem menjalankan matching | Kandidat kecocokan berhasil ditampilkan |
| AC-07 | User mengajukan klaim | Claim number berhasil dibuat |
| AC-08 | Admin memverifikasi klaim | Status klaim diperbarui |
| AC-09 | Admin menyetujui klaim | Barang berubah menjadi RESERVED |
| AC-10 | Admin melakukan handover | Bukti transaksi tersimpan |
| AC-11 | Handover selesai | Barang RETURNED dan klaim COMPLETED |
| AC-12 | User menerima notifikasi | Email terkirim melalui SMTP existing |
| AC-13 | Admin melakukan aktivitas | Audit log tercatat |
| AC-14 | User mencoba mengakses data internal | Akses ditolak |
| AC-15 | Modul baru diintegrasikan | Modul existing tetap berfungsi |
| AC-16 | Build aplikasi dilakukan | Production build berhasil |

---

# 13. DEVELOPMENT IMPLEMENTATION PLAN

## Phase 1 – System Analysis and Preparation

- Review Prisma schema existing.
- Review authentication dan authorization.
- Review user model dan role.
- Review email service.
- Review file upload service.
- Review audit log implementation.
- Menentukan database migration strategy.

## Phase 2 – Database and Core Module

- Menambahkan model LostReport.
- Menambahkan model FoundReport.
- Menambahkan model FoundItem.
- Menambahkan master category dan location.
- Implementasi Lost Report.
- Implementasi Found Report.
- Implementasi Admin Verification.

## Phase 3 – Inventory and Matching

- Implementasi Found Item Management.
- Implementasi storage location.
- Implementasi item matching.
- Implementasi Found Item Catalog.
- Integrasi notifikasi.

## Phase 4 – Claim and Handover

- Implementasi Claim Management.
- Implementasi Claim Evidence.
- Implementasi Claim Verification.
- Implementasi Handover Management.
- Integrasi audit log.

## Phase 5 – Dashboard and Reporting

- Implementasi dashboard.
- Implementasi analytics.
- Implementasi filter dan pencarian.
- Implementasi export CSV.
- Implementasi status monitoring.

## Phase 6 – Testing and Deployment

- Unit testing.
- Integration testing.
- Authorization testing.
- Database integrity testing.
- Regression testing modul existing.
- Production build.
- Deployment dan monitoring.

---

# 14. OPEN DECISIONS AND ASSUMPTIONS

Beberapa keputusan perlu dikonfirmasi sebelum implementasi dimulai.

| ID | Decision | Initial Recommendation |
|---|---|---|
| OD-01 | Akses mahasiswa | Gunakan akun kampus yang terintegrasi atau mekanisme akun yang disetujui |
| OD-02 | Akses pengunjung | Tidak dibuka pada MVP |
| OD-03 | PETUGAS permissions | Menggunakan permission existing dengan pembatasan modul |
| OD-04 | Public catalog | Katalog dapat dilihat oleh pengguna yang memiliki akses |
| OD-05 | Physical storage | Satu lokasi penyimpanan pusat |
| OD-06 | Matching mechanism | Rule-based matching |
| OD-07 | Unclaimed item policy | Masa penyimpanan ditentukan administrator |
| OD-08 | Email notification | Menggunakan SMTP WahSys |
| OD-09 | Evidence storage | Menggunakan existing object storage |
| OD-10 | Data retention | Mengikuti kebijakan retensi data institusi |

Keputusan tersebut harus disepakati sebelum development karena beberapa di antaranya memengaruhi desain database, akses pengguna, dan proses bisnis.

---

# 15. FINAL DEVELOPMENT GUIDELINES

Developer wajib memperhatikan ketentuan berikut:

1. Jangan membangun aplikasi Lost and Found secara terpisah.
2. Jangan membuat authentication atau user management baru.
3. Jangan membuat koneksi database baru.
4. Jangan mengubah schema existing secara destruktif.
5. Jangan menghapus atau mengganti modul WahSys yang sudah tersedia.
6. Gunakan Prisma ORM dan struktur database existing.
7. Gunakan email dan storage service existing.
8. Ikuti UI/UX dan navigasi existing.
9. Semua transaksi penting harus tercatat di audit log.
10. Pastikan seluruh modul existing tetap berjalan setelah integrasi.

**Definition of Done:**

Modul Lost and Found dinyatakan selesai apabila seluruh functional requirements telah diimplementasikan, seluruh acceptance criteria terpenuhi, integrasi dengan infrastruktur WahSys berjalan, dan tidak terdapat regresi pada modul existing.

---

**END OF SOFTWARE REQUIREMENTS SPECIFICATION**

**Document:** WahSys – Lost and Found Management Module  
**Version:** 1.0  
**Architecture:** Existing WahSys Application Extension  
**Operating Model:** Centralized