import { Elysia } from "elysia";
import * as materiService from "../services/materiService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { broadcastStatsUpdate } from "../socket/socketServer";
import { io } from "../index";

export const materiController = new Elysia()
  .use(authMiddleware)
  .get("/api/materi", async ({ user }) => {
    return await materiService.getAllMateriByUser(user.userId);
  })
  .get("/api/materi/:id", async ({ params: { id }, user, set }) => {
    const materi = await materiService.getMateriById(parseInt(id), user.userId);
    if (!materi) {
      set.status = 404;
      return { status: 404, message: "Materi tidak ditemukan" };
    }
    return materi;
  })

  .post("/api/materi", async ({ request, user, set }) => {
    try {
      const formData = await request.formData();
      const result = await materiService.createMateri(formData, user.userId);

      // Broadcast stats update to user
      if (result.success) {
        await broadcastStatsUpdate(io, user.userId);
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

  .put("/api/materi/:id", async ({ params: { id }, request, user, set }) => {
    try {
      const formData = await request.formData();
      const result = await materiService.updateMateri(
        parseInt(id),
        formData,
        user.userId,
      );

      // Broadcast stats update to user
      if (result.success) {
        await broadcastStatsUpdate(io, user.userId);
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

  .delete("/api/materi/:id", async ({ params: { id }, user, set }) => {
    try {
      const result = await materiService.deleteMateri(
        parseInt(id),
        user.userId,
      );

      // Broadcast stats update to user
      if (result.success) {
        await broadcastStatsUpdate(io, user.userId);
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
  .get("/api/stats", async ({ user }) => {
    try {
      const userMateri = await materiService.getAllMateriByUser(user.userId);
      const now = new Date();

      return {
        total: userMateri.length,
        fitur: userMateri.filter((m) => m.fitur && m.fitur.trim()).length,
        komunikasi: userMateri.filter(
          (m) => m.nama_materi && m.nama_materi.trim(),
        ).length,
        aktif: userMateri.filter((m) => new Date(m.end_date) > now).length,
        expired: userMateri.filter((m) => new Date(m.end_date) <= now).length,
        dokumen: userMateri.filter(
          (m) => m.dokumenMateri && m.dokumenMateri.length > 0,
        ).length,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching stats:", error);
      return { error: "Failed to fetch stats" };
    }
  });
