import { Elysia } from "elysia";

import { Role } from "../models/userModel";
import { authMiddleware } from "./authMiddleware";

export const rolesMiddleware = (allowedRoles: Role[]) =>
  new Elysia().use(authMiddleware).derive(({ set, user }) => {
    if (!user.role) {
      set.status = 403;
      throw new Error("Forbidden: user role not defined");
    }
    if (user.role && !allowedRoles.includes(user.role)) {
      set.status = 403;
      throw new Error("Access denied: insufficient role");
    }
    return {};
  });
