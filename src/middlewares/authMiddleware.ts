import jwt from "jsonwebtoken";
import { Elysia } from "elysia";
import { Role } from "../models/userModel";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface UserPayload {
  userId: number;
  email: string;
  name: string;
  role?: Role;
}

export const authMiddleware = (app: Elysia) =>
  app.decorate("user", {} as UserPayload).derive(({ headers, set }) => {
    const authHeader = headers?.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      return { user: decoded };
    } catch {
      set.status = 401;
      throw new Error("Invalid or expired token");
    }
  });

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
