import { Elysia } from "elysia";
import * as materiService from "../services/materiService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { broadcastStatsUpdate } from "../socket/socketServer";
import { io } from "../index";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const materiController = new Elysia({ prefix: "/api/materi" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/", async ({ query, user }) => {
    // Extract pagination and filter parameters
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const search = (query.search as string) || "";
    const status = (query.status as string) || "";
    const brand = (query.brand as string) || "";
    const cluster = (query.cluster as string) || "";
    const fitur = (query.fitur as string) || "";
    const jenis = (query.jenis as string) || "";
    const startDate = (query.start_date as string) || "";
    const endDate = (query.end_date as string) || "";
    const onlyVisualDocs = query.only_visual_docs === "true";

    const filters = {
      search,
      status,
      brand,
      cluster,
      fitur,
      jenis,
      start_date: startDate,
      end_date: endDate,
      only_visual_docs: onlyVisualDocs,
    };

    return await materiService.getPaginatedMateri(
      page,
      limit,
      filters,
      user.role
    );
  })
  .get("/:id", async ({ params: { id }, user, set }) => {
    const materi = await materiService.getMateriById(parseInt(id), user.role);
    if (!materi) {
      set.status = 404;
      return { status: 404, message: "Materi tidak ditemukan" };
    }
    return materi;
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

// Add new endpoint for manual stats refresh
export const statsController = new Elysia()
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/api/stats", async ({ user }) => {
    try {
      const userMateri = await materiService.getAllMateri(user.role);
      const now = new Date();

      return {
        total: userMateri.length,
        fitur: userMateri.filter((m) => m.fitur && m.fitur.trim()).length,
        komunikasi: userMateri.filter(
          (m) => m.nama_materi && m.nama_materi.trim()
        ).length,
        aktif: userMateri.filter((m) => new Date(m.end_date) > now).length,
        expired: userMateri.filter((m) => new Date(m.end_date) <= now).length,
        dokumen: userMateri.filter(
          (m) => m.dokumenMateri && m.dokumenMateri.length > 0
        ).length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { error: "Failed to fetch stats" };
    }
  });
