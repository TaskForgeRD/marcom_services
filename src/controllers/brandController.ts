import { Elysia, t } from "elysia";
import * as brandService from "../services/brandService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const brandController = new Elysia({ prefix: "/api/brands" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/", async () => brandService.getAllBrands())
  .get("/:id", async ({ params: { id }, set }) => {
    const brand = await brandService.getBrandById(parseInt(id));
    if (!brand) {
      set.status = 404;
      return { success: false, message: "Brand tidak ditemukan" };
    }
    return { success: true, data: brand };
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
          return { success: false, message: "Nama brand harus diisi" };
        }

        // Check if brand already exists
        const existingBrand = await brandService.getBrandByName(name.trim());
        if (existingBrand) {
          set.status = 400;
          return {
            success: false,
            message: "Brand dengan nama tersebut sudah ada",
          };
        }

        const result = await brandService.createBrand(name.trim());
        return {
          success: true,
          data: result,
          message: "Brand berhasil ditambahkan",
        };
      } catch (error) {
        console.error("Error creating brand:", error);
        set.status = 500;
        return { success: false, message: "Gagal menambahkan brand" };
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
          return { success: false, message: "Nama brand harus diisi" };
        }

        // Check if brand with same name already exists (excluding current brand)
        const existingBrand = await brandService.getBrandByName(name.trim());
        if (existingBrand && existingBrand.id !== parseInt(id)) {
          set.status = 400;
          return {
            success: false,
            message: "Brand dengan nama tersebut sudah ada",
          };
        }

        const result = await brandService.updateBrand(
          parseInt(id),
          name.trim()
        );
        if (!result) {
          set.status = 404;
          return { success: false, message: "Brand tidak ditemukan" };
        }

        return { success: true, message: "Brand berhasil diperbarui" };
      } catch (error) {
        console.error("Error updating brand:", error);
        set.status = 500;
        return { success: false, message: "Gagal memperbarui brand" };
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
      const result = await brandService.deleteBrand(parseInt(id));
      if (!result) {
        set.status = 404;
        return { success: false, message: "Brand tidak ditemukan" };
      }

      return { success: true, message: "Brand berhasil dihapus" };
    } catch (error) {
      console.error("Error deleting brand:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string" &&
        (error as { message: string }).message.includes(
          "foreign key constraint"
        )
      ) {
        set.status = 400;
        return {
          success: false,
          message:
            "Brand tidak dapat dihapus karena masih digunakan dalam data materi",
        };
      }
      set.status = 500;
      return { success: false, message: "Gagal menghapus brand" };
    }
  });
