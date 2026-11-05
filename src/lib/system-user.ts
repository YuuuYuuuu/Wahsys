import { prisma } from "@/lib/db/prisma";
import { SYSTEM_USER_EMAIL } from "@/lib/constants/system-user";

export async function getSystemUserId(): Promise<string> {
  const u = await prisma.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (!u) throw new Error("System user missing — jalankan npm run db:seed");
  return u.id;
}
