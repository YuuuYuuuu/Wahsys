import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit/audit";
import { LoanPolicy, LoanStatus } from "@prisma/client";
import { getSystemUserId } from "@/lib/system-user";
import * as tplService from "@/lib/services/email-template.service";
import { renderTemplate } from "@/lib/mail/template-render";
import { sendMailSafe } from "@/lib/mail/mailer";
import { logger } from "@/lib/logger";
import * as appSetting from "@/lib/services/app-setting.service";

function appName() {
  return process.env.NEXT_PUBLIC_APP_NAME ?? process.env.APP_NAME ?? "WahSys";
}

function appBaseUrl() {
  const u = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return u.replace(/\/$/, "");
}

export async function listPublicItems() {
  return prisma.item.findMany({
    where: {
      stock: { gt: 0 },
      category: { loanPolicy: LoanPolicy.LOANABLE },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      stock: true,
      location: true,
      condition: true,
      imageUrl: true,
      category: { select: { name: true } },
    },
  });
}

async function requireItemLoanable(itemId: string) {
  const row = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, category: { select: { loanPolicy: true } } },
  });
  if (!row) throw new Error("Item not found");
  if (row.category.loanPolicy !== LoanPolicy.LOANABLE) {
    throw new Error("Item tidak tersedia untuk dipinjam");
  }
}

export async function listLoans(status?: LoanStatus) {
  return prisma.loan.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { item: { include: { category: true } }, user: { select: { id: true, name: true, email: true } } },
  });
}

export const LOANS_PAGE_SIZE_DEFAULT = 10;

export async function listLoansPaginated(status: LoanStatus | undefined, page: number, pageSize: number = LOANS_PAGE_SIZE_DEFAULT) {
  const where = status ? { status } : undefined;
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const total = await prisma.loan.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * safeSize;
  const items = await prisma.loan.findMany({
    where,
    skip,
    take: safeSize,
    orderBy: { createdAt: "desc" },
    include: { item: { include: { category: true } }, user: { select: { id: true, name: true, email: true } } },
  });
  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function createLoan(
  userId: string,
  data: {
    itemId: string;
    borrowerName: string;
    quantity: number;
    loanDate: Date;
    location: string;
    dueDate?: Date;
  },
  req: Request
) {
  await requireItemLoanable(data.itemId);
  const loan = await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: data.itemId } });
    if (!item) throw new Error("Item not found");
    if (item.stock < data.quantity) throw new Error("Insufficient stock");

    await tx.item.update({
      where: { id: data.itemId },
      data: { stock: { decrement: data.quantity } },
    });

    return tx.loan.create({
      data: {
        itemId: data.itemId,
        userId,
        borrowerName: data.borrowerName,
        quantity: data.quantity,
        loanDate: data.loanDate,
        location: data.location,
        status: LoanStatus.DIPINJAM,
        dueDate: data.dueDate ?? null,
        confirmedAt: new Date(),
      },
      include: { item: true },
    });
  });

  await logAudit(userId, "LOAN_CREATE", `loan:${loan.id}`, {
    req,
    metadata: { itemId: data.itemId, quantity: data.quantity },
  });
  return loan;
}

export async function createPublicLoanRequest(
  data: {
    itemId: string;
    borrowerName: string;
    borrowerEmail: string;
    borrowerPhone: string;
    quantity: number;
    dueDate: Date;
    location: string;
  },
  req: Request
): Promise<{ outcome: "pending_approval"; loanId: string } | { outcome: "insufficient_stock" }> {
  await requireItemLoanable(data.itemId);
  const item = await prisma.item.findUnique({ where: { id: data.itemId } });
  if (!item) throw new Error("Item not found");

  if (item.stock < data.quantity) {
    const denyTpl = await tplService.getEmailTemplateByKey("LOAN_STOCK_UNAVAILABLE");
    if (!denyTpl) {
      throw new Error("Template email LOAN_STOCK_UNAVAILABLE tidak ada — jalankan seed");
    }
    const denyVars: Record<string, string> = {
      appName: appName(),
      borrowerName: data.borrowerName,
      itemName: item.name,
      quantity: String(data.quantity),
      availableStock: String(item.stock),
    };
    try {
      await sendMailSafe({
        to: data.borrowerEmail,
        subject: renderTemplate(denyTpl.subject, denyVars),
        html: renderTemplate(denyTpl.bodyHtml, denyVars),
      });
    } catch (e) {
      logger.error({ err: e }, "stock unavailable mail failed");
      throw new Error("Gagal mengirim email — periksa pengaturan SMTP");
    }
    return { outcome: "insufficient_stock" };
  }

  const loan = await prisma.loan.create({
    data: {
      itemId: data.itemId,
      userId: null,
      borrowerName: data.borrowerName,
      borrowerEmail: data.borrowerEmail,
      borrowerPhone: data.borrowerPhone,
      quantity: data.quantity,
      loanDate: new Date(),
      dueDate: data.dueDate,
      location: data.location || "-",
      status: LoanStatus.MENUNGGU_PERSETUJUAN,
    },
    include: { item: true },
  });

  const sysId = await getSystemUserId();
  await logAudit(sysId, "PUBLIC_LOAN_REQUEST", `loan:${loan.id}`, {
    req,
    metadata: { itemId: data.itemId, email: data.borrowerEmail },
  });

  return { outcome: "pending_approval", loanId: loan.id };
}

export async function approvePublicLoanRequest(
  userId: string,
  loanId: string,
  req: Request
): Promise<{ loanId: string }> {
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, status: LoanStatus.MENUNGGU_PERSETUJUAN },
    include: { item: true },
  });
  if (!loan) throw new Error("Pengajuan tidak ditemukan atau sudah diproses");
  if (!loan.borrowerEmail) throw new Error("Email peminjam kosong");

  const item = await prisma.item.findUnique({ where: { id: loan.itemId } });
  if (!item || item.stock < loan.quantity) {
    throw new Error("Stok tidak mencukupi untuk menyetujui pengajuan ini");
  }

  const tpl = await tplService.getEmailTemplateByKey("LOAN_APPROVED");
  if (!tpl) {
    throw new Error("Template email LOAN_APPROVED tidak ada — jalankan seed atau buat di Pengaturan email");
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  const confirmUrl = `${appBaseUrl()}/api/public/loan-confirm?token=${token}`;
  const vars: Record<string, string> = {
    appName: appName(),
    borrowerName: loan.borrowerName,
    itemName: item.name,
    quantity: String(loan.quantity),
    dueDate: loan.dueDate ? loan.dueDate.toLocaleString("id-ID") : "—",
    confirmUrl,
    expiresAt: expires.toLocaleString("id-ID"),
  };

  try {
    await sendMailSafe({
      to: loan.borrowerEmail,
      subject: renderTemplate(tpl.subject, vars),
      html: renderTemplate(tpl.bodyHtml, vars),
    });
  } catch (e) {
    logger.error({ err: e, loanId }, "LOAN_APPROVED mail failed");
    throw new Error("Gagal mengirim email persetujuan — periksa pengaturan SMTP");
  }

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.MENUNGGU_KONFIRMASI,
      confirmationToken: token,
      confirmationExpiresAt: expires,
    },
  });

  await logAudit(userId, "LOAN_APPROVE", `loan:${loanId}`, {
    req,
    metadata: { itemId: loan.itemId },
  });

  return { loanId };
}

export async function rejectPublicLoanRequest(
  userId: string,
  loanId: string,
  opts: { reason?: string },
  req: Request
): Promise<{ loanId: string }> {
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, status: LoanStatus.MENUNGGU_PERSETUJUAN },
    include: { item: true },
  });
  if (!loan) throw new Error("Pengajuan tidak ditemukan atau sudah diproses");

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.DITOLAK,
      confirmationToken: null,
      confirmationExpiresAt: null,
    },
  });

  const tpl = await tplService.getEmailTemplateByKey("LOAN_REJECTED");
  if (tpl && loan.borrowerEmail) {
    const vars: Record<string, string> = {
      appName: appName(),
      borrowerName: loan.borrowerName,
      itemName: loan.item.name,
      quantity: String(loan.quantity),
      reason: opts.reason?.trim() || "—",
    };
    try {
      await sendMailSafe({
        to: loan.borrowerEmail,
        subject: renderTemplate(tpl.subject, vars),
        html: renderTemplate(tpl.bodyHtml, vars),
      });
    } catch (e) {
      logger.error({ err: e, loanId }, "LOAN_REJECTED mail failed");
    }
  }

  await logAudit(userId, "LOAN_REJECT", `loan:${loanId}`, {
    req,
    metadata: { itemId: loan.itemId },
  });

  return { loanId };
}

/** Stok berkurang, status → DIPINJAM (dipakai tautan email & konfirmasi admin). */
async function finalizeLoanFromWaitingConfirmation(loan: { id: string; itemId: string; quantity: number }) {
  await prisma.$transaction(async (tx) => {
    const item = await tx.item.findUnique({ where: { id: loan.itemId } });
    if (!item || item.stock < loan.quantity) throw new Error("Insufficient stock");

    await tx.item.update({
      where: { id: loan.itemId },
      data: { stock: { decrement: loan.quantity } },
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: LoanStatus.DIPINJAM,
        confirmationToken: null,
        confirmationExpiresAt: null,
        confirmedAt: new Date(),
      },
    });
  });
}

export async function confirmPublicLoan(token: string, req?: Request) {
  const loan = await prisma.loan.findFirst({
    where: { confirmationToken: token, status: LoanStatus.MENUNGGU_KONFIRMASI },
    include: { item: true },
  });
  if (!loan || !loan.confirmationExpiresAt) return { ok: false as const, reason: "invalid" };
  if (loan.confirmationExpiresAt < new Date()) return { ok: false as const, reason: "expired" };

  try {
    await finalizeLoanFromWaitingConfirmation(loan);
  } catch (e) {
    if (e instanceof Error && e.message === "Insufficient stock") {
      return { ok: false as const, reason: "stock" as const };
    }
    throw e;
  }

  const sysId = await getSystemUserId();
  await logAudit(sysId, "PUBLIC_LOAN_CONFIRMED", `loan:${loan.id}`, { req });

  return { ok: true as const, loanId: loan.id };
}

/** Konfirmasi dari dashboard admin/petugas (tanpa tautan email; kedaluwarsa token diabaikan). */
export async function confirmLoanByStaff(userId: string, loanId: string, req: Request) {
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, status: LoanStatus.MENUNGGU_KONFIRMASI },
  });
  if (!loan) {
    throw new Error("Peminjaman tidak ditemukan atau tidak menunggu konfirmasi");
  }

  try {
    await finalizeLoanFromWaitingConfirmation(loan);
  } catch (e) {
    if (e instanceof Error && e.message === "Insufficient stock") {
      throw new Error("Stok tidak mencukupi untuk menyelesaikan konfirmasi");
    }
    throw e;
  }

  await logAudit(userId, "LOAN_CONFIRM_STAFF", `loan:${loanId}`, {
    req,
    metadata: { itemId: loan.itemId },
  });

  return prisma.loan.findUnique({
    where: { id: loanId },
    include: { item: { include: { category: true } }, user: { select: { id: true, name: true, email: true } } },
  });
}

export async function returnLoan(userId: string, loanId: string, returnDate: Date, req: Request) {
  await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error("Loan not found");
    if (loan.status === LoanStatus.DIKEMBALIKAN) throw new Error("Already returned");
    if (loan.status !== LoanStatus.DIPINJAM) throw new Error("Loan is not active");

    await tx.item.update({
      where: { id: loan.itemId },
      data: { stock: { increment: loan.quantity } },
    });

    await tx.loan.update({
      where: { id: loanId },
      data: { status: LoanStatus.DIKEMBALIKAN, returnDate },
    });
  });

  await logAudit(userId, "LOAN_RETURN", `loan:${loanId}`, { req });
  return prisma.loan.findUnique({
    where: { id: loanId },
    include: { item: { include: { category: true } }, user: { select: { id: true, name: true } } },
  });
}

export async function sendDueReminders() {
  const daysStr = await appSetting.getSetting("reminder_days_before", "1");
  const days = Math.max(0, parseInt(daysStr, 10) || 1);
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + days);

  const loans = await prisma.loan.findMany({
    where: {
      status: LoanStatus.DIPINJAM,
      reminderSentAt: null,
      dueDate: { not: null, lte: horizon, gte: now },
    },
    include: { item: true },
  });

  const tpl = await tplService.getEmailTemplateByKey("LOAN_REMINDER");
  if (!tpl) return { sent: 0, skipped: loans.length };

  let sent = 0;
  for (const loan of loans) {
    if (!loan.borrowerEmail || !loan.dueDate) continue;
    const vars: Record<string, string> = {
      appName: appName(),
      borrowerName: loan.borrowerName,
      itemName: loan.item.name,
      quantity: String(loan.quantity),
      dueDate: loan.dueDate.toLocaleString("id-ID"),
      confirmUrl: "",
      expiresAt: "",
    };
    try {
      await sendMailSafe({
        to: loan.borrowerEmail,
        subject: renderTemplate(tpl.subject, vars),
        html: renderTemplate(tpl.bodyHtml, vars),
      });
      await prisma.loan.update({
        where: { id: loan.id },
        data: { reminderSentAt: new Date() },
      });
      sent += 1;
    } catch (e) {
      logger.error({ err: e, loanId: loan.id }, "reminder mail failed");
    }
  }
  return { sent, skipped: loans.length - sent };
}
