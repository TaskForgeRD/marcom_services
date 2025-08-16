import { Elysia } from "elysia";
import * as materiService from "../services/materiService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { broadcastStatsUpdate } from "../socket/socketServer";
import { io } from "../index";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";
import parseFiltersFromQuery from "../utils/parseFiltersFromQuery";

export const materiController = new Elysia({ prefix: "/api/materi" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))

  .get("/", async ({ query, user }) => {
    try {
      const page = parseInt(query.page as string);
      const limit = parseInt(query.limit as string);
      const filters = parseFiltersFromQuery(query);

      const result = await materiService.getPaginatedMateri(
        page,
        limit,
        filters,
        user.role
      );
      return result;
    } catch (error) {
      console.error("Error fetching materi:", error);
      return {
        error: "Failed to fetch materi",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  })

  .get("/with-stats", async ({ query, user }) => {
    try {
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 10;
      const filters = parseFiltersFromQuery(query);

      const result = await materiService.getPaginatedMateriWithStats(
        page,
        limit,
        filters,
        user.role
      );
      return result;
    } catch (error) {
      console.error("Error fetching materi with stats:", error);
      return {
        error: "Failed to fetch materi with stats",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  })

  .get("/:id", async ({ params: { id }, user, set }) => {
    try {
      const materi = await materiService.getMateriById(parseInt(id), user.role);
      if (!materi) {
        set.status = 404;
        return { status: 404, message: "Materi tidak ditemukan" };
      }
      return materi;
    } catch (error) {
      console.error("Error fetching materi by id:", error);
      set.status = 500;
      return {
        error: "Failed to fetch materi",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  })

  .post("/", async ({ request, user, set }) => {
    try {
      const formData = await request.formData();
      const result = await materiService.createMateri(formData, user.userId);

      if (result.success) {
        await broadcastStatsUpdate(io, user.role);
      }

      return result;
    } catch (error) {
      console.error("Error creating materi:", error);
      set.status = 500;
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal menyimpan data",
      };
    }
  })

  .put("/:id", async ({ params: { id }, request, user, set }) => {
    try {
      const formData = await request.formData();
      const result = await materiService.updateMateri(
        parseInt(id),
        formData,
        user.userId
      );

      if (result.success) {
        await broadcastStatsUpdate(io, user.role);
      }

      return result;
    } catch (error) {
      console.error("Error updating materi:", error);
      set.status = 500;
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Gagal memperbarui data",
      };
    }
  })

  .delete("/:id", async ({ params: { id }, set, user }) => {
    try {
      const result = await materiService.deleteMateri(parseInt(id));

      if (result.success) {
        await broadcastStatsUpdate(io, user.role);
      }

      return result;
    } catch (error) {
      console.error("Error deleting materi:", error);
      set.status = 500;
      return { success: false, message: "Gagal menghapus data" };
    }
  });

export const statsController = new Elysia()
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))

  .get("/api/stats", async ({ query, user }) => {
    try {
      const filters = parseFiltersFromQuery(query);
      const stats = await materiService.getMateriStats(filters);
      return stats;
    } catch (error) {
      console.error("Error fetching stats:", error);
      return {
        error: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  });
