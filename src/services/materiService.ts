// services/materiService.ts
import * as materiModel from "../models/materiModel";
import * as brandService from "./brandService";
import * as clusterService from "./clusterService";
import * as fiturService from "./fiturService";
import * as jenisService from "./jenisService";
import { saveFile } from "../utils/fileUpload";
import { validateMateriData } from "../utils/validation";
import { Materi } from "../types";

export async function getAllMateriByUser(userId: number) {
  return await materiModel.getAllMateriByUser(userId);
}

export async function getMateriById(id: number, userId: number) {
  return await materiModel.getMateriById(id, userId);
}

export async function createMateri(formData: FormData, userId: number) {
  try {
    // Extract basic materi data
    const materiData = {
      brand: formData.get("brand") as string,
      cluster: formData.get("cluster") as string,
      fitur: formData.get("fitur") as string,
      nama_materi: formData.get("nama_materi") as string,
      jenis: formData.get("jenis") as string,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      periode: (formData.get("periode") as string) || "0",
    };

    // Get brand, cluster, fitur, and jenis IDs
    const brandId = await brandService.getBrandIdByName(materiData.brand);
    const clusterId = await clusterService.getClusterIdByName(
      materiData.cluster
    );
    const fiturId = await fiturService.getFiturIdByName(materiData.fitur);
    const jenisId = await jenisService.getJenisIdByName(materiData.jenis);

    const materi: Materi = {
      user_id: userId,
      brand_id: brandId,
      cluster_id: clusterId,
      fitur_id: fiturId,
      nama_materi: materiData.nama_materi,
      jenis_id: jenisId,
      start_date: materiData.start_date,
      end_date: materiData.end_date,
      periode: materiData.periode,
    };

    // Validate data
    const validation = validateMateriData(materi);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Create materi
    const materiId = await materiModel.createMateri(materi);

    // Handle dokumen materi
    const dokumenCount = parseInt(
      (formData.get("dokumenMateriCount") as string) || "0"
    );

    for (let i = 0; i < dokumenCount; i++) {
      const linkDokumen = formData.get(
        `dokumenMateri[${i}][linkDokumen]`
      ) as string;
      const tipeMateri = formData.get(
        `dokumenMateri[${i}][tipeMateri]`
      ) as string;
      const thumbnailFile = formData.get(
        `dokumenMateri[${i}][thumbnail]`
      ) as File;
      const keywords = JSON.parse(
        (formData.get(`dokumenMateri[${i}][keywords]`) as string) || "[]"
      );

      if (linkDokumen || thumbnailFile) {
        let thumbnailPath = "";
        if (thumbnailFile && thumbnailFile.size > 0) {
          thumbnailPath = await saveFile(thumbnailFile);
        }

        const dokumenId = await materiModel.createDokumenMateri({
          materi_id: materiId,
          link_dokumen: linkDokumen || "",
          tipe_materi: tipeMateri || "",
          thumbnail: thumbnailPath,
        });

        // Add keywords
        if (Array.isArray(keywords)) {
          for (const keyword of keywords) {
            if (keyword.trim()) {
              await materiModel.createKeyword(dokumenId, keyword.trim());
            }
          }
        }
      }
    }

    return { success: true, id: materiId, message: "Materi berhasil disimpan" };
  } catch (error) {
    console.error("Error in createMateri:", error);
    throw error;
  }
}

export async function updateMateri(
  id: number,
  formData: FormData,
  userId: number
) {
  try {
    // Check if materi belongs to user
    const existingMateri = await materiModel.getMateriById(id, userId);
    if (!existingMateri) {
      throw new Error("Materi tidak ditemukan atau Anda tidak memiliki akses");
    }

    // Extract basic materi data
    const materiData = {
      brand: formData.get("brand") as string,
      cluster: formData.get("cluster") as string,
      fitur: formData.get("fitur") as string,
      nama_materi: formData.get("nama_materi") as string,
      jenis: formData.get("jenis") as string,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string,
      periode: (formData.get("periode") as string) || "0",
    };

    // Get brand, cluster, fitur, and jenis IDs
    const brandId = await brandService.getBrandIdByName(materiData.brand);
    const clusterId = await clusterService.getClusterIdByName(
      materiData.cluster
    );
    const fiturId = await fiturService.getFiturIdByName(materiData.fitur);
    const jenisId = await jenisService.getJenisIdByName(materiData.jenis);

    if (!brandId || !clusterId) {
      throw new Error("Brand atau cluster tidak ditemukan");
    }

    const materi: Materi = {
      user_id: userId,
      brand_id: brandId,
      cluster_id: clusterId,
      fitur_id: fiturId,
      nama_materi: materiData.nama_materi,
      jenis_id: jenisId,
      start_date: materiData.start_date,
      end_date: materiData.end_date,
      periode: materiData.periode,
    };

    // Validate data
    const validation = validateMateriData(materi);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Update materi
    await materiModel.updateMateri(id, materi);

    // Get existing documents to preserve thumbnails
    const existingDokumens = await materiModel.getDokumenMateriByMateriId(id);

    // Delete existing documents and keywords
    await materiModel.deleteDokumenByMateriId(id);

    // Handle new dokumen materi
    const dokumenCount = parseInt(
      (formData.get("dokumenMateriCount") as string) || "0"
    );

    for (let i = 0; i < dokumenCount; i++) {
      const linkDokumen = formData.get(
        `dokumenMateri[${i}][linkDokumen]`
      ) as string;
      const tipeMateri = formData.get(
        `dokumenMateri[${i}][tipeMateri]`
      ) as string;
      const thumbnailFile = formData.get(
        `dokumenMateri[${i}][thumbnail]`
      ) as File;
      const keywords = JSON.parse(
        (formData.get(`dokumenMateri[${i}][keywords]`) as string) || "[]"
      );

      // Get existing thumbnail path from form data or find matching existing document
      const existingThumbnailPath = formData.get(
        `dokumenMateri[${i}][existingThumbnail]`
      ) as string;

      if (linkDokumen || thumbnailFile || existingThumbnailPath) {
        let thumbnailPath = "";

        if (thumbnailFile && thumbnailFile.size > 0) {
          // New thumbnail uploaded
          thumbnailPath = await saveFile(thumbnailFile);
        } else if (existingThumbnailPath) {
          // Use existing thumbnail path
          thumbnailPath = existingThumbnailPath;
        } else {
          // Try to match with existing document by link or index
          const existingDoc = existingDokumens.find(
            (doc: any, index: number) =>
              doc.link_dokumen === linkDokumen || index === i
          );
          if (existingDoc && existingDoc.thumbnail) {
            thumbnailPath = existingDoc.thumbnail;
          }
        }

        const dokumenId = await materiModel.createDokumenMateri({
          materi_id: id,
          link_dokumen: linkDokumen || "",
          tipe_materi: tipeMateri || "",
          thumbnail: thumbnailPath,
        });

        // Add keywords
        if (Array.isArray(keywords)) {
          for (const keyword of keywords) {
            if (keyword.trim()) {
              await materiModel.createKeyword(dokumenId, keyword.trim());
            }
          }
        }
      }
    }

    return { success: true, message: "Materi berhasil diperbarui" };
  } catch (error) {
    console.error("Error in updateMateri:", error);
    throw error;
  }
}

export async function deleteMateri(id: number, userId: number) {
  try {
    // Check if materi belongs to user
    const existingMateri = await materiModel.getMateriById(id, userId);
    if (!existingMateri) {
      throw new Error("Materi tidak ditemukan atau Anda tidak memiliki akses");
    }

    await materiModel.deleteMateri(id, userId);
    return { success: true, message: "Materi berhasil dihapus" };
  } catch (error) {
    console.error("Error in deleteMateri:", error);
    throw error;
  }
}
