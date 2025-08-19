import * as statsModel from "../models/statsModel";
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

interface CompleteStatsResult {
  fitur: number;
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
  dokumen: number;
  lastUpdated: string;
}

interface MonthlyStatsResult {
  total: Array<{ month: string; value: number }>;
  fitur: Array<{ month: string; value: number }>;
  komunikasi: Array<{ month: string; value: number }>;
  aktif: Array<{ month: string; value: number }>;
  expired: Array<{ month: string; value: number }>;
  dokumen: Array<{ month: string; value: number }>;
}

export async function getMonthlyStats(
  filters: PaginationFilters,
  userRole?: Role
): Promise<MonthlyStatsResult> {
  try {
    return await statsModel.getDetailedMonthlyStats(filters);
  } catch (error) {
    throw new Error(`Failed to get monthly stats: ${error}`);
  }
}

export async function getCompleteStats(
  filters: PaginationFilters,
  userRole?: Role
): Promise<CompleteStatsResult> {
  try {
    return await statsModel.getCompleteStats(filters);
  } catch (error) {
    throw new Error(`Failed to get complete stats: ${error}`);
  }
}

export async function getFiturCount(
  filters: PaginationFilters,
  userRole?: Role
): Promise<number> {
  try {
    return await statsModel.getFiturCount(filters);
  } catch (error) {
    throw new Error(`Failed to get fitur count: ${error}`);
  }
}

export async function getMateriStats(
  filters: PaginationFilters,
  userRole?: Role
): Promise<{
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
}> {
  try {
    return await statsModel.getMateriStats(filters);
  } catch (error) {
    throw new Error(`Failed to get materi stats: ${error}`);
  }
}

export async function getDokumenCount(
  filters: PaginationFilters,
  userRole?: Role
): Promise<number> {
  try {
    return await statsModel.getDokumenCount(filters);
  } catch (error) {
    throw new Error(`Failed to get dokumen count: ${error}`);
  }
}
