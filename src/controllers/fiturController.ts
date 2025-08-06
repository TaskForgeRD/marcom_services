import { Elysia, t } from "elysia";
import * as fiturService from "../services/fiturService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const fiturController = new Elysia({ prefix: "/api/fitur" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/", async () => {
    return await fiturService.getAllFitur();
  })
  .get("/:id", async ({ params: { id }, set }) => {
    const fitur = await fiturService.getFiturById(parseInt(id));
    if (!fitur) {
      set.status = 404;
      return { success: false, message: "Fitur tidak ditemukan" };
    }
    return { success: true, data: fitur };
  })
  .use(rolesMiddleware(["superadmin", "admin"]))
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama fitur harus diisi" };
        }

        const existingFitur = await fiturService.getFiturByName(name.trim());
        if (existingFitur) {
          set.status = 400;
          return {
            success: false,
            message: "Fitur dengan nama tersebut sudah ada",
          };
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
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, set }) => {
      try {
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama fitur harus diisi" };
        }

        const existingFitur = await fiturService.getFiturByName(name.trim());
        if (existingFitur && existingFitur.id !== parseInt(id)) {
          set.status = 400;
          return {
            success: false,
            message: "Fitur dengan nama tersebut sudah ada",
          };
        }

        const result = await fiturService.updateFitur(
          parseInt(id),
          name.trim()
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
    }
  )
  .delete("/:id", async ({ params: { id }, set }) => {
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
        typeof (error as { message?: unknown }).message === "string" &&
        (error as { message: string }).message.includes(
          "foreign key constraint"
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
