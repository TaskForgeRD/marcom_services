import { Elysia, t } from "elysia";
import * as fiturService from "../services/fiturService";
import { authMiddleware } from "../middlewares/authMiddleware";

export const fiturController = new Elysia()
  .use(authMiddleware)
  .get("/api/fitur", async () => {
    return await fiturService.getAllFitur();
  })
  .get("/api/fitur/:id", async ({ params: { id }, set }) => {
    const fitur = await fiturService.getFiturById(parseInt(id));
    if (!fitur) {
      set.status = 404;
      return { success: false, message: "Fitur tidak ditemukan" };
    }
    return { success: true, data: fitur };
  })
  .post(
    "/api/fitur",
    async ({ body, set }) => {
      try {
        // Safe destructuring with fallback
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama fitur harus diisi" };
        }

        const result = await fiturService.createFitur(name.trim());
        return {
          success: true,
          data: result,
          message: "Fitur berhasil ditambahkan",
        };
      } catch (error) {
        console.error("Error creating fitur:", error);
        set.status = 500;
        return { success: false, message: "Gagal menambahkan fitur" };
      }
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    },
  )
  .put(
    "/api/fitur/:id",
    async ({ params: { id }, body, set }) => {
      try {
        // Safe destructuring with fallback
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama fitur harus diisi" };
        }

        const result = await fiturService.updateFitur(
          parseInt(id),
          name.trim(),
        );
        if (!result) {
          set.status = 404;
          return { success: false, message: "Fitur tidak ditemukan" };
        }

        return { success: true, message: "Fitur berhasil diperbarui" };
      } catch (error) {
        console.error("Error updating fitur:", error);
        set.status = 500;
        return { success: false, message: "Gagal memperbarui fitur" };
      }
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    },
  )

  // Delete fitur
  .delete("/api/fitur/:id", async ({ params: { id }, set }) => {
    try {
      const result = await fiturService.deleteFitur(parseInt(id));
      if (!result) {
        set.status = 404;
        return { success: false, message: "Fitur tidak ditemukan" };
      }

      return { success: true, message: "Fitur berhasil dihapus" };
    } catch (error) {
      console.error("Error deleting fitur:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string" &&
        (error as { message: string }).message.includes(
          "foreign key constraint",
        )
      ) {
        set.status = 400;
        return {
          success: false,
          message:
            "Fitur tidak dapat dihapus karena masih digunakan dalam data materi",
        };
      }
      set.status = 500;
      return { success: false, message: "Gagal menghapus fitur" };
    }
  });
