import { prisma } from "@/lib/db/prisma";

export async function listEmailTemplates() {
  return prisma.emailTemplate.findMany({ orderBy: { key: "asc" } });
}

export async function getEmailTemplateByKey(key: string) {
  return prisma.emailTemplate.findUnique({ where: { key } });
}

export async function updateEmailTemplate(
  key: string,
  data: { name?: string; subject?: string; bodyHtml?: string }
) {
  return prisma.emailTemplate.update({
    where: { key },
    data,
  });
}
