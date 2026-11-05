import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit/audit";
import type { LoanPolicy } from "@prisma/client";

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });
}

export async function createCategory(userId: string, name: string, req: Request, loanPolicy?: LoanPolicy) {
  const cat = await prisma.category.create({ data: { name, loanPolicy: loanPolicy ?? undefined } });
  await logAudit(userId, "CATEGORY_CREATE", `category:${cat.id}`, { req });
  return cat;
}

export async function updateCategory(
  userId: string,
  id: string,
  data: { name?: string; loanPolicy?: LoanPolicy },
  req: Request
) {
  const cat = await prisma.category.update({ where: { id }, data });
  await logAudit(userId, "CATEGORY_UPDATE", `category:${id}`, { req });
  return cat;
}

export async function deleteCategory(userId: string, id: string, req: Request) {
  await prisma.category.delete({ where: { id } });
  await logAudit(userId, "CATEGORY_DELETE", `category:${id}`, { req });
}
