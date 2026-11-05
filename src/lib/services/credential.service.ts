import { randomUUID } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit/audit";
import { presignPut, isS3Configured } from "@/lib/services/s3.service";

export async function listCredentials() {
  return prisma.credential.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      username: true,
      category: true,
      encryptedData: true,
      iv: true,
      salt: true,
      createdAt: true,
      updatedAt: true,
      files: {
        orderBy: { uploadedAt: "asc" },
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          iv: true,
          fileUrl: true,
        },
      },
    },
  });
}

const credentialListSelect = {
  id: true,
  title: true,
  username: true,
  category: true,
  encryptedData: true,
  iv: true,
  salt: true,
  createdAt: true,
  updatedAt: true,
  files: {
    orderBy: { uploadedAt: "asc" as const },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      iv: true,
      fileUrl: true,
    },
  },
} as const;

export async function listCredentialsPaginated(page: number, pageSize: number = 12) {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const total = await prisma.credential.count();
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = await prisma.credential.findMany({
    orderBy: { updatedAt: "desc" },
    select: credentialListSelect,
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  });
  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function listAuditLogsPaginated(page: number, pageSize: number = 20) {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const total = await prisma.auditLog.count();
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  });
  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function getCredential(id: string) {
  return prisma.credential.findUnique({
    where: { id },
    include: { files: true },
  });
}

export async function createCredential(
  userId: string,
  data: {
    title: string;
    username?: string | null;
    encryptedData: string;
    iv: string;
    salt: string;
    category?: string | null;
  },
  req: Request
) {
  const cred = await prisma.credential.create({
    data: {
      title: data.title,
      username: data.username ?? undefined,
      encryptedData: data.encryptedData,
      iv: data.iv,
      salt: data.salt,
      category: data.category ?? undefined,
      createdById: userId,
    },
  });
  await logAudit(userId, "CREDENTIAL_CREATE", `credential:${cred.id}`, { req });
  return cred;
}

export async function updateCredential(
  userId: string,
  id: string,
  data: {
    title?: string;
    username?: string | null;
    encryptedData?: string;
    iv?: string;
    salt?: string;
    category?: string | null;
  },
  req: Request
) {
  const cred = await prisma.credential.update({
    where: { id },
    data: {
      ...("title" in data && data.title !== undefined ? { title: data.title } : {}),
      ...("username" in data ? { username: data.username ?? null } : {}),
      ...("encryptedData" in data && data.encryptedData ? { encryptedData: data.encryptedData } : {}),
      ...("iv" in data && data.iv ? { iv: data.iv } : {}),
      ...("salt" in data && data.salt ? { salt: data.salt } : {}),
      ...("category" in data ? { category: data.category ?? null } : {}),
    },
  });
  await logAudit(userId, "CREDENTIAL_UPDATE", `credential:${id}`, { req });
  return cred;
}

export async function deleteCredential(userId: string, id: string, req: Request) {
  await prisma.credential.delete({ where: { id } });
  await logAudit(userId, "CREDENTIAL_DELETE", `credential:${id}`, { req });
}

export async function presignCredentialFile(
  userId: string,
  credentialId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  req: Request
) {
  const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!cred) throw new Error("Credential not found");
  if (!isS3Configured()) throw new Error("S3 is not configured");

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const key = `credentials/${credentialId}/${randomUUID()}-${safeName}`;
  const { url, fileUrl } = await presignPut(key, fileType);

  await logAudit(userId, "CREDENTIAL_FILE_PRESIGN", `credential:${credentialId}`, {
    req,
    metadata: { key, fileName: safeName },
  });

  return { uploadUrl: url, key, fileUrl, fileName: safeName };
}

export async function attachCredentialFile(
  userId: string,
  credentialId: string,
  meta: { fileName: string; fileUrl: string; fileType: string; fileSize: number; iv?: string | null },
  req: Request
) {
  const row = await prisma.credentialFile.create({
    data: {
      credentialId,
      fileName: meta.fileName,
      fileUrl: meta.fileUrl,
      fileType: meta.fileType,
      fileSize: meta.fileSize,
      iv: meta.iv ?? undefined,
    },
  });
  await logAudit(userId, "CREDENTIAL_FILE_ATTACH", `credential:${credentialId}`, {
    req,
    metadata: { fileId: row.id },
  });
  return row;
}
