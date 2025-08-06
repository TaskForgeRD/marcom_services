import { Elysia, t } from "elysia";
import * as jenisService from "../services/jenisService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const jenisController = new Elysia({ prefix: "/api/jenis" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/", async () => {
    return await jenisService.getAllJenis();
  })
  .get("/:id", async ({ params: { id }, set }) => {
    const jenis = await jenisService.getJenisById(parseInt(id));
    if (!jenis) {
      set.status = 404;
      return { success: false, message: "Jenis tidak ditemukan" };
    }
    return { success: true, data: jenis };
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
          return { success: false, message: "Nama jenis harus diisi" };
        }

        const existingJenis = await jenisService.getJenisByName(name.trim());
        if (existingJenis) {
          set.status = 400;
          return {
            success: false,
            message: "Jenis dengan nama tersebut sudah ada",
          };
        }

        const result = await jenisService.createJenis(name.trim());
        return {
          success: true,
          data: result,
          message: "Jenis berhasil ditambahkan",
        };
      } catch (error) {
        console.error("Error creating jenis:", error);
        set.status = 500;
        return { success: false, message: "Gagal menambahkan jenis" };
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
          return { success: false, message: "Nama jenis harus diisi" };
        }

        const existingJenis = await jenisService.getJenisByName(name.trim());
        if (existingJenis && existingJenis.id !== parseInt(id)) {
          set.status = 400;
          return {
            success: false,
            message: "Jenis dengan nama tersebut sudah ada",
          };
        }

        const result = await jenisService.updateJenis(
          parseInt(id),
          name.trim()
        );
        if (!result) {
          set.status = 404;
          return { success: false, message: "Jenis tidak ditemukan" };
        }

        return { success: true, message: "Jenis berhasil diperbarui" };
      } catch (error) {
        console.error("Error updating jenis:", error);
        set.status = 500;
        return { success: false, message: "Gagal memperbarui jenis" };
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
      const result = await jenisService.deleteJenis(parseInt(id));
      if (!result) {
        set.status = 404;
        return { success: false, message: "Jenis tidak ditemukan" };
      }

      return { success: true, message: "Jenis berhasil dihapus" };
    } catch (error) {
      console.error("Error deleting jenis:", error);
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
            "Jenis tidak dapat dihapus karena masih digunakan dalam data materi",
        };
      }
      set.status = 500;
      return { success: false, message: "Gagal menghapus jenis" };
    }
  });
