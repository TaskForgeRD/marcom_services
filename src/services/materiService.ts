import * as materiModel from "../models/materiModel";
import * as brandService from "./brandService";
import * as clusterService from "./clusterService";
import * as fiturService from "./fiturService";
import * as jenisService from "./jenisService";
import { saveFile } from "../utils/fileUpload";
import { validateMateriData } from "../utils/validation";
import { Materi } from "../types/";
import { Role } from "../models/userModel";

interface PaginationFilters {
  search?: string;
  status?: string;
  brand?: string;
  cluster?: string;
  fitur?: string;
  jenis?: string;
  start_date?: string;
  end_date?: string;
  only_visual_docs?: boolean;
}

interface PaginatedResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface StatsResult {
  total: number;
  aktif: number;
  expired: number;
  fitur: number;
  komunikasi: number;
  dokumen: number;
  lastUpdated: string;
}

function getHiddenFieldsByRole(role?: Role): Array<string> {
  switch (role) {
    case "guest":
      return ["link_dokumen"];
    case "superadmin":
    case "admin":
    default:
      return [];
  }
}

export async function getPaginatedMateri(
  page: number,
  limit: number,
  filters: PaginationFilters,
  userRole?: Role
): Promise<PaginatedResult> {
  const hideFields = getHiddenFieldsByRole(userRole);

  const offset = (page - 1) * limit;
  const total = await materiModel.countMateri(filters);

  if (total === 0) {
    return {
      data: [],
      total,
      page,
      limit,
      totalPages: 0,
    };
  }

  const materiIds = await materiModel.findMateriIds(filters, limit, offset);
  const data = await materiModel.findMateriByIds(materiIds, hideFields);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getPaginatedMateriWithStats(
  page: number,
  limit: number,
  filters: PaginationFilters,
  userRole?: Role
): Promise<PaginatedResult & { stats: StatsResult }> {
  const paginatedResult = await getPaginatedMateri(
    page,
    limit,
    filters,
    userRole
  );
  const stats = await getMateriStats(filters);

  return {
    ...paginatedResult,
    stats,
  };
}

export async function getMateriStats(
  filters: PaginationFilters
): Promise<StatsResult> {
  const stats = await materiModel.calculateStats(filters);

  return {
    ...stats,
    lastUpdated: new Date().toISOString(),
  };
}

export async function getMateriById(id: number, userRole?: Role) {
  const hideFields = getHiddenFieldsByRole(userRole);
  return await materiModel.getMateriById(id, hideFields);
}

export async function createMateri(formData: FormData, userId: number) {
  const materiData = extractMateriDataFromForm(formData);

  const brandId = await brandService.getBrandIdByName(materiData.brand);
  const clusterId = await clusterService.getClusterIdByName(materiData.cluster);
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

  const validation = validateMateriData(materi);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const materiId = await materiModel.createMateri(materi);
  await processDokumenMateri(formData, materiId);

  return { success: true, id: materiId, message: "Materi berhasil disimpan" };
}

export async function updateMateri(
  id: number,
  formData: FormData,
  userId: number
) {
  const existingMateri = await materiModel.getMateriById(id);
  if (!existingMateri) {
    throw new Error("Materi tidak ditemukan atau Anda tidak memiliki akses");
  }

  const materiData = extractMateriDataFromForm(formData);

  const brandId = await brandService.getBrandIdByName(materiData.brand);
  const clusterId = await clusterService.getClusterIdByName(materiData.cluster);
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

  const validation = validateMateriData(materi);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  await materiModel.updateMateri(id, materi);

  const existingDokumens = await materiModel.getDokumenMateriByMateriId(id);
  await materiModel.deleteDokumenByMateriId(id);
  await processDokumenMateri(formData, id, existingDokumens);

  return { success: true, message: "Materi berhasil diperbarui" };
}

export async function deleteMateri(id: number) {
  const existingMateri = await materiModel.getMateriById(id);
  if (!existingMateri) {
    throw new Error("Materi tidak ditemukan atau Anda tidak memiliki akses");
  }

  await materiModel.deleteMateri(id);
  return { success: true, message: "Materi berhasil dihapus" };
}

function extractMateriDataFromForm(formData: FormData) {
  return {
    brand: formData.get("brand") as string,
    cluster: formData.get("cluster") as string,
    fitur: formData.get("fitur") as string,
    nama_materi: formData.get("nama_materi") as string,
    jenis: formData.get("jenis") as string,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    periode: (formData.get("periode") as string) || "0",
  };
}

async function processDokumenMateri(
  formData: FormData,
  materiId: number,
  existingDokumens: any[] = []
) {
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
      let thumbnailPath = await processThumbnail(
        thumbnailFile,
        formData.get(`dokumenMateri[${i}][existingThumbnail]`) as string,
        existingDokumens,
        linkDokumen,
        i
      );

      const dokumenId = await materiModel.createDokumenMateri({
        materi_id: materiId,
        link_dokumen: linkDokumen || "",
        tipe_materi: tipeMateri || "",
        thumbnail: thumbnailPath,
      });

      if (Array.isArray(keywords)) {
        for (const keyword of keywords) {
          if (keyword.trim()) {
            await materiModel.createKeyword(dokumenId, keyword.trim());
          }
        }
      }
    }
  }
}

async function processThumbnail(
  thumbnailFile: File | null,
  existingThumbnailPath: string,
  existingDokumens: any[],
  linkDokumen: string,
  index: number
): Promise<string> {
  if (thumbnailFile && thumbnailFile.size > 0) {
    return await saveFile(thumbnailFile);
  }

  if (existingThumbnailPath) {
    return existingThumbnailPath;
  }

  const existingDoc = existingDokumens.find(
    (doc: any, idx: number) => doc.link_dokumen === linkDokumen || idx === index
  );

  return existingDoc?.thumbnail || "";
}
