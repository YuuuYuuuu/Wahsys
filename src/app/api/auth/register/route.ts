import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators/auth";
import { registerUser } from "@/lib/services/auth.service";
import { withApi } from "@/lib/api-handler";
import { jsonError } from "@/lib/http";
import { registerRatelimit } from "@/lib/rate-limit";

export const POST = withApi(
  async (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rl = await registerRatelimit(ip);
    if (!rl.success) return jsonError("Too many registration attempts", 429);

    const body = registerSchema.parse(await req.json());
    const result = await registerUser(body, req);
    return NextResponse.json(
      {
        ok: true,
        message:
          "Pendaftaran berhasil. Akun Anda menunggu persetujuan administrator sebelum dapat masuk.",
        user: result.user,
      },
      { status: 201 }
    );
  },
  { rateLimit: false }
);
