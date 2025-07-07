import { Elysia } from "elysia";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";

interface JWTPayload {
  userId: number;
  email: string;
  name: string;
}

export function requireAuth(handler: (ctx: any) => any) {
  return async (ctx: any) => {
    const authHeader = ctx.headers?.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      ctx.set.status = 401;
      return { success: false, message: "Authentication required" };
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      ctx.user = decoded;
      return await handler(ctx);
    } catch (err) {
      ctx.set.status = 401;
      return { success: false, message: "Invalid or expired token" };
    }
  };
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
