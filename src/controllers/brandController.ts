import { Elysia, t } from "elysia";
import * as brandService from "../services/brandService";
import { requireAuth } from "../middlewares/authMiddleware";

export const brandController = new Elysia()
  // Get all brands
  .get("/api/brands", async () => {
    return await brandService.getAllBrands();
  })

  // Get brand by ID
  .get("/api/brands/:id", async ({ params: { id }, set }) => {
    const brand = await brandService.getBrandById(parseInt(id));
    if (!brand) {
      set.status = 404;
      return { success: false, message: "Brand tidak ditemukan" };
    }
    return { success: true, data: brand };
  })

  // Create new brand - FIXED VERSION
  .post(
    "/api/brands",
    requireAuth(async ({ body, set }) => {
      try {
        // Safe destructuring with fallback
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama brand harus diisi" };
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
    }),
    {
      // Add body validation schema
      body: t.Object({
        name: t.String(),
      }),
    }
  )

  // Update brand - FIXED VERSION
  .put(
    "/api/brands/:id",
    requireAuth(async ({ params: { id }, body, set }) => {
      try {
        // Safe destructuring with fallback
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama brand harus diisi" };
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
    }),
    {
      // Add body validation schema
      body: t.Object({
        name: t.String(),
      }),
    }
  )

  // Delete brand
  .delete(
    "/api/brands/:id",
    requireAuth(async ({ params: { id }, set }) => {
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
    })
  );
