import { prisma } from "@/lib/db/prisma";

export async function getDashboardStats() {
  const lowStockThreshold = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueEnd = new Date(now);
  dueEnd.setDate(dueEnd.getDate() + 7);
  dueEnd.setHours(23, 59, 59, 999);
  const dueSoonWhere = {
    status: "DIPINJAM" as const,
    dueDate: { not: null, lte: dueEnd, gte: dayStart },
  };

  const [
    byCondition,
    activeLoans,
    pendingApprovalLoans,
    pendingConfirmLoans,
    totalItems,
    borrowedUnits,
    categories,
    recentLoans,
    loansDueSoon,
    loansDueSoonCount,
  ] = await Promise.all([
    prisma.item.groupBy({
      by: ["condition"],
      _count: { id: true },
    }),
    prisma.loan.count({ where: { status: "DIPINJAM" } }),
    prisma.loan.count({ where: { status: "MENUNGGU_PERSETUJUAN" } }),
    prisma.loan.count({ where: { status: "MENUNGGU_KONFIRMASI" } }),
    prisma.item.aggregate({ _sum: { stock: true }, _count: { id: true } }),
    prisma.loan.aggregate({
      where: { status: "DIPINJAM" },
      _sum: { quantity: true },
    }),
    prisma.category.count(),
    prisma.loan.findMany({
      where: { status: "DIPINJAM" },
      take: 10,
      orderBy: { loanDate: "desc" },
      include: {
        item: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.loan.findMany({
      where: dueSoonWhere,
      take: 12,
      orderBy: { dueDate: "asc" },
      include: {
        item: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.loan.count({ where: dueSoonWhere }),
  ]);

  const lowStock = await prisma.item.count({
    where: { stock: { lte: lowStockThreshold } },
  });

  return {
    itemsByCondition: byCondition.map((r) => ({
      condition: r.condition,
      count: r._count.id,
    })),
    activeLoans,
    pendingApprovalLoans,
    pendingConfirmLoans,
    totalStock: totalItems._sum.stock ?? 0,
    borrowedUnitsOnLoan: borrowedUnits._sum.quantity ?? 0,
    itemKinds: totalItems._count.id,
    categoryCount: categories,
    lowStockCount: lowStock,
    lowStockThreshold,
    recentActiveLoans: recentLoans,
    loansDueSoon: loansDueSoon.map((l) => ({
      id: l.id,
      borrowerName: l.borrowerName,
      quantity: l.quantity,
      dueDate: l.dueDate,
      item: l.item,
      user: l.user,
    })),
    loansDueSoonCount,
  };
}
