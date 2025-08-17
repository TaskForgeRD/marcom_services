import { Materi } from "../types/";

export function validateMateriData(data: Partial<Materi>): {
  valid: boolean;
  message?: string;
} {
  if (!data.brand_id) return { valid: false, message: "Brand ID is required" };
  if (!data.cluster_id)
    return { valid: false, message: "Cluster ID is required" };
  if (!data.nama_materi)
    return { valid: false, message: "Nama materi is required" };
  if (!data.jenis_id) return { valid: false, message: "Jenis is required" };

  return { valid: true };
}
