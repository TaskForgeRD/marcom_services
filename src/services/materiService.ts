// services/materiService.ts
import * as materiModel from "../models/materiModel";
import * as brandService from "./brandService";
import * as clusterService from "./clusterService";
import * as fiturService from "./fiturService";
import * as jenisService from "./jenisService";
import { saveFile } from "../utils/fileUpload";
import { validateMateriData } from "../utils/validation";
import { Materi } from "../types/";
import { Role } from "../models/userModel";

// Helper function untuk cek status aktif
function isMateriAktif(itemEndDate: string | null): boolean {
  if (!itemEndDate) return false;
  const now = new Date();
  const todayUTC = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const endDate = new Date(itemEndDate);
  return endDate > todayUTC;
}

// Updated function untuk menentukan field yang disembunyikan berdasarkan role dan status
function getHiddenFieldByRoleAndStatus(role?: Role, isActive?: boolean) {
  switch (role) {
    case "superadmin":
      // Superadmin bisa melihat link dokumen baik aktif maupun expired
      return [];
    case "admin":
    case "guest":
      // Admin dan guest hanya bisa melihat link dokumen jika materi aktif
      return isActive ? [] : ["link_dokumen"];
    default:
      return ["link_dokumen"];
  }
}

// Helper function untuk filter materi
function applyFilters(data: any[], filters: any) {
  return data.filter((item) => {
    // Brand filter
    if (filters.brand && item.brand !== filters.brand) {
      return false;
    }

    // Cluster filter
    if (filters.cluster && item.cluster !== filters.cluster) {
      return false;
    }

    // Fitur filter
    if (filters.fitur && item.fitur !== filters.fitur) {
      return false;
    }

    // Jenis filter
    if (filters.jenis && item.jenis !== filters.jenis) {
      return false;
    }

    // Status filter
    if (filters.status) {
      const isAktif = item.end_date && isMateriAktif(item.end_date);
      if (filters.status === "Aktif" && !isAktif) return false;
      if (filters.status === "Expired" && isAktif) return false;
    }

    // Date range filter
    if (filters.start_date && filters.end_date) {
      const filterStartDate = new Date(filters.start_date);
      const filterEndDate = new Date(filters.end_date);
      const itemStartDate = item.start_date ? new Date(item.start_date) : null;
      const itemEndDate = item.end_date ? new Date(item.end_date) : null;

      if (itemStartDate && itemEndDate) {
        // Check for overlap
        const hasOverlap =
          itemStartDate <= filterEndDate && itemEndDate >= filterStartDate;
        if (!hasOverlap) return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const namaMatch = item.nama_materi.toLowerCase().includes(searchLower);

      const keywordMatch = Array.isArray(item.dokumenMateri)
        ? item.dokumenMateri.some((dokumen: any) =>
            (dokumen.keywords || []).some((keyword: string) =>
              keyword.toLowerCase().includes(searchLower)
            )
          )
        : false;

      if (!namaMatch && !keywordMatch) return false;
    }

    // Visual docs filter
    if (filters.onlyVisualDocs) {
      const hasKeyVisualDoc =
        Array.isArray(item.dokumenMateri) &&
        item.dokumenMateri.some(
          (dokumen: any) => dokumen.tipeMateri === "Key Visual"
        );
      if (!hasKeyVisualDoc) return false;
    }

    return true;
  });
}

// Updated function untuk apply permission berdasarkan role dan status per item
function applyPermissionsByRoleAndStatus(data: any[], userRole?: Role) {
  return data.map((item) => {
    const isActive = item.end_date && isMateriAktif(item.end_date);
    const hiddenFields = getHiddenFieldByRoleAndStatus(userRole, isActive);

    // Jika link_dokumen harus disembunyikan, modify dokumenMateri
    if (
      hiddenFields.includes("link_dokumen") &&
      Array.isArray(item.dokumenMateri)
    ) {
      item.dokumenMateri = item.dokumenMateri.map((dokumen: any) => ({
        ...dokumen,
        linkDokumen: "", // Hide the link
      }));
    }

    return item;
  });
}

// Updated paginated service function
export async function getAllMateriWithPagination(
  userRole?: Role,
  page: number = 1,
  limit: number = 10,
  filters: any = {}
) {
  try {
    // Get all data first (without hiding any fields initially)
    const allData = await materiModel.getAllMateri([]);

    // Apply filters
    const filteredData = applyFilters(allData, filters);

    // Sort by updated_at or created_at (newest first)
    const sortedData = filteredData.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at);
      const dateB = new Date(b.updated_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate pagination
    const total = sortedData.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedData = sortedData.slice(offset, offset + limit);

    // Apply permissions based on role and status for each item
    const dataWithPermissions = applyPermissionsByRoleAndStatus(
      paginatedData,
      userRole
    );

    return {
      data: dataWithPermissions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        startIndex: offset + 1,
        endIndex: Math.min(offset + limit, total),
      },
      filters: filters,
    };
  } catch (error) {
    console.error("Error in getAllMateriWithPagination:", error);
    throw error;
  }
}

// Updated function untuk single materi
export async function getMateriById(id: number, userRole?: Role) {
  try {
    // Get materi without hiding fields initially
    const materi = await materiModel.getMateriById(id, []);

    if (!materi) {
      return null;
    }

    // Apply permissions based on role and status
    const isActive = materi.end_date && isMateriAktif(materi.end_date);
    const hiddenFields = getHiddenFieldByRoleAndStatus(userRole, isActive);

    // If link_dokumen should be hidden, modify dokumenMateri
    if (
      hiddenFields.includes("link_dokumen") &&
      Array.isArray(materi.dokumenMateri)
    ) {
      materi.dokumenMateri = materi.dokumenMateri.map((dokumen: any) => ({
        ...dokumen,
        linkDokumen: "", // Hide the link
      }));
    }

    return materi;
  } catch (error) {
    console.error("Error in getMateriById:", error);
    throw error;
  }
}

// Keep existing functions for backward compatibility
export async function getAllMateri(userRole?: Role) {
  try {
    // Get all data without hiding fields initially
    const allData = await materiModel.getAllMateri([]);

    // Apply permissions based on role and status for each item
    const dataWithPermissions = applyPermissionsByRoleAndStatus(
      allData,
      userRole
    );

    return dataWithPermissions;
  } catch (error) {
    console.error("Error in getAllMateri:", error);
    throw error;
  }
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

// NEW: Helper function to get user role from request context
// This should be passed from the controller
function getUserRoleFromContext(userId: number): Promise<Role | undefined> {
  // This would typically query the database to get user role
  // For now, we'll assume it's passed from the controller
  return Promise.resolve(undefined);
}

export async function updateMateri(
  id: number,
  formData: FormData,
  userId: number,
  userRole?: Role // NEW: Add userRole parameter
) {
  try {
    // Check if materi exists
    const existingMateri = await materiModel.getMateriById(id);
    if (!existingMateri) {
      throw new Error("Materi tidak ditemukan atau Anda tidak memiliki akses");
    }

    // NEW: Get existing dokumen data if user is admin
    const existingDokumens = await materiModel.getDokumenMateriByMateriId(id);

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

    // Delete existing documents and keywords
    await materiModel.deleteDokumenByMateriId(id);

    // Handle new dokumen materi
    const dokumenCount = parseInt(
      (formData.get("dokumenMateriCount") as string) || "0"
    );

    for (let i = 0; i < dokumenCount; i++) {
      let linkDokumen = formData.get(
        `dokumenMateri[${i}][linkDokumen]`
      ) as string;

      // NEW: For admin users, preserve original link_dokumen from database
      if (userRole === "admin" && existingDokumens[i]) {
        linkDokumen = existingDokumens[i].link_dokumen;
        console.log(
          `Admin detected: Preserving original link for dokumen ${i}:`,
          linkDokumen
        );
      }

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

export async function deleteMateri(id: number) {
  try {
    // Check if materi belongs to user
    const existingMateri = await materiModel.getMateriById(id);
    if (!existingMateri) {
      throw new Error("Materi tidak ditemukan atau Anda tidak memiliki akses");
    }

    await materiModel.deleteMateri(id);
    return { success: true, message: "Materi berhasil dihapus" };
  } catch (error) {
    console.error("Error in deleteMateri:", error);
    throw error;
  }
}
