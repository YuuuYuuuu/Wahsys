import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

export type AccessPayload = {
  sub: string;
  email: string;
  role: Role;
};

function getSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return s;
}

export function signAccessToken(payload: AccessPayload): string {
  const expiresIn: string = process.env.JWT_ACCESS_EXPIRES ?? "15m";
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    getSecret(),
    { expiresIn: expiresIn as jwt.SignOptions["expiresIn"], algorithm: "HS256" }
  );
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, getSecret()) as jwt.JwtPayload & {
    sub: string;
    email: string;
    role: Role;
  };
  return { sub: decoded.sub, email: decoded.email, role: decoded.role };
}
