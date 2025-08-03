// this is  middleware roles need to check per module
//

import { Role } from "../models/userModel";

// any role?
// role allowed
export function rolesMiddleware(
  allowedRoles: Role[] = [],
  nextHandler: (ctx: any) => any,
) {
  return async (ctx: any) => {
    const user = ctx.user;

    if (!user || !user.role) {
      ctx.set.status = 403;
      return { success: false, message: "Access denied" };
    }

    if (allowedRoles.length === 0 || allowedRoles.includes(user.role)) {
      return await nextHandler(ctx);
    } else {
      ctx.set.status = 403;
      return {
        success: false,
        message: "You do not have permission to access this resource",
      };
    }
  };
}
