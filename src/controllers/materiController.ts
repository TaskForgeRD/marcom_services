import { Elysia } from "elysia";
import * as materiService from "../services/materiService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { broadcastStatsUpdate } from "../socket/socketServer";
import { io } from "../index";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const materiController = new Elysia({ prefix: "/api/materi" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/", async (ctx) => {
    // Extract pagination parameters
    const page = parseInt(ctx.query.page || "1");
    const limit = parseInt(ctx.query.limit || "10");

    // Extract filter parameters
    const filters = {
      brand: ctx.query.brand,
      cluster: ctx.query.cluster,
      fitur: ctx.query.fitur,
      jenis: ctx.query.jenis,
      status: ctx.query.status,
      start_date: ctx.query.start_date,
      end_date: ctx.query.end_date,
      search: ctx.query.search,
      onlyVisualDocs: ctx.query.onlyVisualDocs === "true",
    };

    return await materiService.getAllMateriWithPagination(
      ctx.user.role,
      page,
      limit,
      filters
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

      // Broadcast stats update to user
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

      // Broadcast stats update to user
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

      // Broadcast stats update to user
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
