import { randomUUID } from "crypto";
import {
  ItemKind,
  LoanPolicy,
  OrgRole,
  PerformancePeriodType,
  PerformanceReportStatus,
  PrismaClient,
  Role,
  StaffUnit,
  LostReportStatus,
  FoundItemStatus,
  ReceiptStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SYSTEM_EMAIL = "system@wahsys.internal";

const DEFAULT_TEMPLATES = [
  {
    key: "LOAN_CONFIRMATION",
    name: "Konfirmasi peminjaman",
    subject: "[{{appName}}] Konfirmasi peminjaman — {{itemName}}",
    bodyHtml: `<p>Halo {{borrowerName}},</p>
<p>Anda mengajukan peminjaman <strong>{{itemName}}</strong> (qty: {{quantity}}).</p>
<p><a href="{{confirmUrl}}">Klik di sini untuk mengonfirmasi peminjaman</a></p>
<p>Tautan berlaku hingga {{expiresAt}}.</p>
<p>Terima kasih,<br/>{{appName}}</p>`,
  },
  {
    key: "LOAN_REMINDER",
    name: "Pengingat pengembalian",
    subject: "[{{appName}}] Pengingat: kembalikan {{itemName}}",
    bodyHtml: `<p>Halo {{borrowerName}},</p>
<p>Ini pengingat untuk mengembalikan <strong>{{itemName}}</strong> sebelum atau pada <strong>{{dueDate}}</strong>.</p>
<p>Jumlah dipinjam: {{quantity}}</p>
<p>Terima kasih,<br/>{{appName}}</p>`,
  },
  {
    key: "LOAN_STOCK_UNAVAILABLE",
    name: "Stok tidak mencukupi (tamu)",
    subject: "[{{appName}}] Permintaan pinjam — stok tidak mencukupi",
    bodyHtml: `<p>Halo {{borrowerName}},</p>
<p>Permintaan peminjaman <strong>{{itemName}}</strong> (jumlah diminta: {{quantity}}) tidak dapat diproses karena stok tersedia saat ini hanya <strong>{{availableStock}}</strong> unit.</p>
<p>Silakan hubungi petugas atau ajukan ulang setelah stok tersedia.</p>
<p>Terima kasih,<br/>{{appName}}</p>`,
  },
  {
    key: "LOAN_APPROVED",
    name: "Persetujuan admin — lanjut konfirmasi peminjam",
    subject: "[{{appName}}] Peminjaman disetujui — {{itemName}}",
    bodyHtml: `<p>Halo {{borrowerName}},</p>
<p><strong>Pengajuan peminjaman Anda telah disetujui</strong> oleh petugas untuk barang <strong>{{itemName}}</strong> (jumlah: {{quantity}}).</p>
<p>Rencana pengembalian: {{dueDate}}</p>
<p>Untuk menyelesaikan proses, silakan <a href="{{confirmUrl}}">klik di sini untuk mengonfirmasi peminjaman</a>. Setelah dikonfirmasi, stok akan dicatat sebagai dipinjam.</p>
<p>Tautan berlaku hingga {{expiresAt}}.</p>
<p>Terima kasih,<br/>{{appName}}</p>`,
  },
  {
    key: "LOAN_REJECTED",
    name: "Pengajuan peminjaman ditolak",
    subject: "[{{appName}}] Pengajuan peminjaman tidak dapat diproses",
    bodyHtml: `<p>Halo {{borrowerName}},</p>
<p>Mohon maaf, pengajuan peminjaman <strong>{{itemName}}</strong> (qty: {{quantity}}) <strong>tidak dapat kami setujui</strong> saat ini.</p>
<p>Catatan: {{reason}}</p>
<p>Silakan hubungi petugas jika perlu informasi lebih lanjut.</p>
<p>Terima kasih,<br/>{{appName}}</p>`,
  },
];

async function main() {
  let admin = await prisma.user.findUnique({ where: { email: "admin@wahsys.local" } });
  if (!admin) {
    const password = await bcrypt.hash("Admin123!ChangeMe", 12);
    admin = await prisma.user.create({
      data: {
        name: "Administrator",
        email: "admin@wahsys.local",
        password,
        role: Role.ADMIN,
        accountApproved: true,
      },
    });
    console.log("Seeded admin: admin@wahsys.local / Admin123!ChangeMe");
  }

  const sys = await prisma.user.findUnique({ where: { email: SYSTEM_EMAIL } });
  if (!sys) {
    const pw = await bcrypt.hash(randomUUID(), 12);
    await prisma.user.create({
      data: {
        name: "System",
        email: SYSTEM_EMAIL,
        password: pw,
        role: Role.PETUGAS,
        accountApproved: true,
      },
    });
    console.log("Seeded system user for public/audit actions");
  }

  await prisma.category.createMany({
    data: [
      { name: "Umum", loanPolicy: LoanPolicy.LOANABLE },
      { name: "Elektronik", loanPolicy: LoanPolicy.NOT_LOANABLE },
    ],
    skipDuplicates: true,
  });

  // Default kebijakan pinjam untuk kategori existing:
  // - kategori hanya berisi NON_ASET => LOANABLE
  // - kategori hanya berisi ASET => NOT_LOANABLE
  // - kategori campur => NOT_LOANABLE (lebih aman; admin bisa override)
  const cats = await prisma.category.findMany({ select: { id: true } });
  for (const c of cats) {
    const counts = await prisma.item.groupBy({
      by: ["kind"],
      where: { categoryId: c.id },
      _count: { _all: true },
    });
    const hasAset = counts.some((x) => x.kind === ItemKind.ASET && x._count._all > 0);
    const hasNonAset = counts.some((x) => x.kind === ItemKind.NON_ASET && x._count._all > 0);
    if (!hasAset && !hasNonAset) continue; // kosong: biarkan default

    const loanPolicy =
      hasNonAset && !hasAset ? LoanPolicy.LOANABLE : LoanPolicy.NOT_LOANABLE;

    await prisma.category.update({
      where: { id: c.id },
      data: { loanPolicy },
    });
  }

  for (const t of DEFAULT_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: t.key },
      create: t,
      update: {},
    });
  }

  await prisma.appSetting.upsert({
    where: { key: "reminder_days_before" },
    create: { key: "reminder_days_before", value: "1" },
    update: {},
  });

  const smtpCount = await prisma.smtpSettings.count();
  if (smtpCount === 0) {
    await prisma.smtpSettings.create({ data: {} });
    console.log("Seeded empty SmtpSettings row");
  }

  await prisma.user.updateMany({
    where: { email: { in: [SYSTEM_EMAIL, "admin@wahsys.local"] } },
    data: { accountApproved: true },
  });

  // Demo hirarki kinerja: 1 Kepala Seksi + 4 Staff (IT/Humas/Akademik/Support)
  const demoPw = await bcrypt.hash("Staff123!ChangeMe", 12);
  let kepala = await prisma.user.findUnique({ where: { email: "kepala@wahsys.local" } });
  if (!kepala) {
    kepala = await prisma.user.create({
      data: {
        name: "Kepala Seksi Demo",
        email: "kepala@wahsys.local",
        password: demoPw,
        role: Role.PETUGAS,
        orgRole: OrgRole.KEPALA_SEKSI,
        accountApproved: true,
      },
    });
    console.log("Seeded kepala: kepala@wahsys.local / Staff123!ChangeMe");
  } else if (kepala.orgRole !== OrgRole.KEPALA_SEKSI) {
    kepala = await prisma.user.update({
      where: { id: kepala.id },
      data: { orgRole: OrgRole.KEPALA_SEKSI, unit: null, supervisorId: null },
    });
  }

  const staffSeeds: { email: string; name: string; unit: StaffUnit; activities: string }[] = [
    {
      email: "staff.it@wahsys.local",
      name: "Staff IT Demo",
      unit: StaffUnit.IT,
      activities: "- Maintenance server\n- Update patch keamanan\n- Bantu reset akses akun",
    },
    {
      email: "staff.humas@wahsys.local",
      name: "Staff Humas Demo",
      unit: StaffUnit.HUMAS,
      activities: "- Draft pengumuman internal\n- Koordinasi konten media sosial",
    },
    {
      email: "staff.akademik@wahsys.local",
      name: "Staff Akademik Demo",
      unit: StaffUnit.AKADEMIK,
      activities: "- Rekap data kelas\n- Verifikasi jadwal ujian",
    },
    {
      email: "staff.support@wahsys.local",
      name: "Staff Support Demo",
      unit: StaffUnit.SUPPORT,
      activities: "- Tiket helpdesk: 8 selesai\n- Inventaris ruang meeting",
    },
  ];

  const today = new Date();
  const periodStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  for (const s of staffSeeds) {
    let staff = await prisma.user.findUnique({ where: { email: s.email } });
    if (!staff) {
      staff = await prisma.user.create({
        data: {
          name: s.name,
          email: s.email,
          password: demoPw,
          role: Role.PETUGAS,
          orgRole: OrgRole.STAFF,
          unit: s.unit,
          supervisorId: kepala.id,
          accountApproved: true,
        },
      });
      console.log(`Seeded staff: ${s.email} / Staff123!ChangeMe`);
    } else {
      staff = await prisma.user.update({
        where: { id: staff.id },
        data: {
          orgRole: OrgRole.STAFF,
          unit: s.unit,
          supervisorId: kepala.id,
          accountApproved: true,
        },
      });
    }

    const existingReport = await prisma.performanceReport.findUnique({
      where: {
        authorId_periodType_periodStart: {
          authorId: staff.id,
          periodType: PerformancePeriodType.DAILY,
          periodStart,
        },
      },
    });
    if (!existingReport) {
      await prisma.performanceReport.create({
        data: {
          authorId: staff.id,
          periodType: PerformancePeriodType.DAILY,
          periodStart,
          periodEnd: periodStart,
          activities: s.activities,
          blockers: s.unit === StaffUnit.IT ? "Menunggu spare part switch" : null,
          status: PerformanceReportStatus.SUBMITTED,
        },
      });
    }
  }
  console.log("Seeded sample SUBMITTED performance reports for meeting brief demo");

  // Seed sample Lost & Found data
  const existingLost = await prisma.lostReport.findFirst();
  if (!existingLost && admin) {
    const today = new Date();
    const periodMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;

    await prisma.lostReport.create({
      data: {
        ticketNumber: `LR-${periodMonth}-001`,
        userId: admin.id,
        itemName: "Tumbler Minum Stainless Cokelat",
        category: "Aksesoris & Pribadi",
        lostDate: today,
        lastLocation: "Kantin Utama Lt 1",
        description: "Tumbler stainless warna cokelat doff 500ml ada stiker kecil di bawah botol.",
        status: LostReportStatus.PUBLISHED,
      },
    });

    const foundReport = await prisma.foundReport.create({
      data: {
        ticketNumber: `FR-${periodMonth}-001`,
        finderName: "Petugas Keamanan Gedung",
        finderContact: "081299887766",
        itemName: "Tumbler Minum Stainless Cokelat",
        category: "Aksesoris & Pribadi",
        foundLocation: "Meja Kasir Kantin Lt 1",
        foundDate: today,
        publicDescription: "Ditemukan tertinggal di meja kasir kantin lantai 1 saat jam makan siang.",
        privateDescription: "Ada stiker kecil WahSys di bagian bawah tumbler dan sedikit lecet pada tutupnya.",
        receiptStatus: ReceiptStatus.RECEIVED,
      },
    });

    await prisma.foundItem.create({
      data: {
        itemCode: `FND-${periodMonth}-001`,
        foundReportId: foundReport.id,
        itemName: "Tumbler Minum Stainless Cokelat",
        category: "Aksesoris & Pribadi",
        foundDate: today,
        foundLocation: "Kantin Utama Lt 1",
        storageLocation: "Ruang L&F - Lemari B Rak 2",
        condition: "Bagus, sedikit lecet pemakaian",
        publicDescription: "Tumbler stainless steel warna cokelat doff kapasitas sekitar 500ml dalam kondisi bagus.",
        privateDescription: "Terdapat stiker bundar kecil WahSys di bagian dasar bawah botol, tutup ada sedikit goresan tipis.",
        status: FoundItemStatus.AVAILABLE,
        receivedById: admin.id,
      },
    });

    console.log("Seeded sample Lost & Found reports and item (FND-xxx / LR-xxx)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
