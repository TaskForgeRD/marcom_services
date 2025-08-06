import { Elysia, t } from "elysia";
import * as clusterService from "../services/clusterService";
import { authMiddleware } from "../middlewares/authMiddleware";
import { rolesMiddleware } from "../middlewares/rolesMiddleware";

export const clusterController = new Elysia({ prefix: "/api/clusters" })
  .use(authMiddleware)
  .use(rolesMiddleware(["superadmin", "admin", "guest"]))
  .get("/", async () => {
    return await clusterService.getAllClusters();
  })
  .get("/:id", async ({ params: { id }, set }) => {
    const cluster = await clusterService.getClusterById(parseInt(id));
    if (!cluster) {
      set.status = 404;
      return { success: false, message: "Cluster tidak ditemukan" };
    }
    return { success: true, data: cluster };
  })
  .use(rolesMiddleware(["superadmin", "admin"]))
  .post(
    "/api/clusters",
    async ({ body, set }) => {
      try {
        // Safe destructuring with fallback
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama cluster harus diisi" };
        }

        const result = await clusterService.createCluster(name.trim());
        return {
          success: true,
          data: result,
          message: "Cluster berhasil ditambahkan",
        };
      } catch (error) {
        console.error("Error creating cluster:", error);
        set.status = 500;
        return { success: false, message: "Gagal menambahkan cluster" };
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
        // Safe destructuring with fallback
        const requestBody = body || {};
        const { name } = requestBody as { name?: string };

        if (!name || !name.trim()) {
          set.status = 400;
          return { success: false, message: "Nama cluster harus diisi" };
        }

        const result = await clusterService.updateCluster(
          parseInt(id),
          name.trim()
        );
        if (!result) {
          set.status = 404;
          return { success: false, message: "Cluster tidak ditemukan" };
        }

        return { success: true, message: "Cluster berhasil diperbarui" };
      } catch (error) {
        console.error("Error updating cluster:", error);
        set.status = 500;
        return { success: false, message: "Gagal memperbarui cluster" };
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
      const result = await clusterService.deleteCluster(parseInt(id));
      if (!result) {
        set.status = 404;
        return { success: false, message: "Cluster tidak ditemukan" };
      }

      return { success: true, message: "Cluster berhasil dihapus" };
    } catch (error) {
      console.error("Error deleting cluster:", error);
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
            "Cluster tidak dapat dihapus karena masih digunakan dalam data materi",
        };
      }
      set.status = 500;
      return { success: false, message: "Gagal menghapus cluster" };
    }
  });
