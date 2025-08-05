import jwt from "jsonwebtoken";
import { Elysia } from "elysia";
import { Role } from "../models/userModel";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface JWTPayload {
  userId: number;
  email: string;
  name: string;
  role?: Role;
}

export const authMiddleware = new Elysia()
  .decorate("user", {} as JWTPayload)
  .derive(({ headers, set }) => {
    const authHeader = headers?.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return { user: decoded };
    } catch {
      set.status = 401;
      throw new Error("Invalid or expired token");
    }
  });

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
