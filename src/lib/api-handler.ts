import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AuthError, jsonError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { apiRatelimit } from "@/lib/rate-limit";

async function handleApi(
  req: Request,
  run: () => Promise<Response>,
  options?: { rateLimit?: boolean }
): Promise<Response> {
  try {
    if (options?.rateLimit !== false) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
      const rl = await apiRatelimit(ip);
      if (!rl.success) {
        return jsonError("Too many requests", 429);
      }
    }
    return await run();
  } catch (e) {
    if (e instanceof AuthError) {
      return jsonError(e.message, e.status);
    }
    if (e instanceof ZodError) {
      const flattened = e.flatten();
      const firstFieldErr = Object.entries(flattened.fieldErrors)[0];
      const detail = firstFieldErr
        ? `${firstFieldErr[0]}: ${Array.isArray(firstFieldErr[1]) ? firstFieldErr[1].join(", ") : firstFieldErr[1]}`
        : flattened.formErrors[0] || "Validation failed";
      return NextResponse.json({ error: detail, issues: flattened }, { status: 400 });
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error({ code: e.code, meta: e.meta }, "Prisma error");
      if (e.code === "P2002") {
        return jsonError("Data unik sudah digunakan (kode/QR aset mungkin duplikat).", 409);
      }
      if (e.code === "P1001" || e.code === "P1017") {
        return jsonError(
          "Database tidak terhubung. Nyalakan MySQL di MAMP dan periksa DATABASE_URL (host/port).",
          503
        );
      }
      if (e.code === "P2021" || e.code === "P2010") {
        return jsonError(
          "Tabel belum dibuat. Jalankan: npx prisma db push lalu npm run db:seed",
          503
        );
      }
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      logger.error({ err: e }, "Prisma init");
      return jsonError(
        "Database tidak terhubung. Periksa MySQL menyala dan DATABASE_URL di .env.",
        503
      );
    }
    if (e instanceof Error) {
      if (e.message === "Registration is disabled") return jsonError(e.message, 403);
      if (e.message === "Email already registered") return jsonError(e.message, 409);
      if (
        e.message === "Item not found" ||
        e.message === "Loan not found" ||
        e.message === "Overtime request not found"
      )
        return jsonError(e.message, 404);
      if (e.message === "Forbidden overtime request") return jsonError(e.message, 403);
      if (
        e.message === "Insufficient stock" ||
        e.message === "Already returned" ||
        e.message === "Loan is not active" ||
        e.message === "Overtime request is not editable" ||
        e.message === "Overtime request cannot be submitted" ||
        e.message === "Overtime request is not awaiting review" ||
        e.message === "Overtime request is not deletable"
      )
        return jsonError(e.message, 400);
      if (e.message.includes("S3")) return jsonError(e.message, 503);
      if (e.message.includes("SMTP") || e.message.includes("email konfirmasi"))
        return jsonError(e.message, 502);
      if (e.message.includes("Template email")) return jsonError(e.message, 503);
      logger.error({ err: e }, "API error");
      return jsonError("Internal server error", 500);
    }
    return jsonError("Internal server error", 500);
  }
}

/** Static App Router API routes (no dynamic params). */
export function withApi(handler: (req: Request) => Promise<Response>, options?: { rateLimit?: boolean }) {
  return (req: Request) => handleApi(req, () => handler(req), options);
}

/** Dynamic segment routes, e.g. `[id]`. */
export function withApiRoute<P extends Record<string, string>>(
  handler: (req: Request, ctx: { params: Promise<P> }) => Promise<Response>,
  options?: { rateLimit?: boolean }
) {
  return (req: Request, ctx: { params: Promise<P> }) =>
    handleApi(req, () => handler(req, ctx), options);
}
