// src/controllers/statsController.ts
import { Elysia } from "elysia";
import * as statsService from "../services/statsService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";
import parseFiltersFromQuery from "../utils/parseFiltersFromQuery";

export const statsController = new Elysia({ prefix: "/api/stats" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))

  .get("/", async ({ query, user }) => {
    try {
      const filters = parseFiltersFromQuery(query);
      const stats = await statsService.getCompleteStats(filters, user.role);
      return stats;
    } catch (error) {
      console.error("Error fetching complete stats:", error);
      return {
        error: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
