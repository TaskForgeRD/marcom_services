// src/services/statsService.ts
import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";
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

function buildWhereClause(
  filters: PaginationFilters,
  excludeExpired: boolean = false
): {
  whereClause: string;
  queryParams: any[];
} {
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  // Default filter - hanya apply jika tidak ada filter status eksplisit
  if (excludeExpired && !filters.status) {
    whereConditions.push(`m.end_date > CURDATE()`);
  }

  if (filters.search?.trim()) {
    whereConditions.push(`(
      m.nama_materi LIKE ? OR 
      EXISTS (
        SELECT 1 FROM dokumen_materi dm2 
        JOIN dokumen_materi_keyword dmk2 ON dm2.id = dmk2.dokumen_materi_id 
        WHERE dm2.materi_id = m.id AND dmk2.keyword LIKE ?
      )
    )`);
    const searchTerm = `%${filters.search.trim()}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  if (filters.status && !filters.status.toLowerCase().includes("semua")) {
    if (filters.status.toLowerCase() === "aktif") {
      whereConditions.push(`m.end_date > CURDATE()`);
    } else if (filters.status.toLowerCase() === "expired") {
      whereConditions.push(`m.end_date <= CURDATE()`);
    }
  }

  if (filters.brand && !filters.brand.toLowerCase().includes("semua")) {
    whereConditions.push(`b.name = ?`);
    queryParams.push(filters.brand);
  }

  if (filters.cluster && !filters.cluster.toLowerCase().includes("semua")) {
    whereConditions.push(`c.name = ?`);
    queryParams.push(filters.cluster);
  }

  if (filters.fitur && !filters.fitur.toLowerCase().includes("semua")) {
    whereConditions.push(`f.name = ?`);
    queryParams.push(filters.fitur);
  }

  if (filters.jenis && !filters.jenis.toLowerCase().includes("semua")) {
    whereConditions.push(`j.name = ?`);
    queryParams.push(filters.jenis);
  }

  if (filters.start_date) {
    whereConditions.push(`m.end_date >= ?`);
    queryParams.push(new Date(filters.start_date).toISOString().split("T")[0]);
  }

  if (filters.end_date) {
    whereConditions.push(`m.start_date <= ?`);
    queryParams.push(new Date(filters.end_date).toISOString().split("T")[0]);
  }

  if (filters.only_visual_docs) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM dokumen_materi dm_visual 
      WHERE dm_visual.materi_id = m.id AND dm_visual.tipe_materi = 'Key Visual'
    )`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
  return { whereClause, queryParams };
}

export async function getCompleteStats(
  filters: PaginationFilters,
  userRole?: Role
): Promise<CompleteStatsResult> {
  try {
    // Query 1: Jumlah Fitur
    const fiturCount = await getFiturCount(filters);

    // Query 2: Materi Komunikasi, Aktif, dan Expired
    const materiStats = await getMateriStats(filters);

    // Query 3: Jumlah Dokumen
    const dokumenCount = await getDokumenCount(filters);

    return {
      fitur: fiturCount,
      komunikasi: materiStats.komunikasi,
      aktif: materiStats.aktif,
      expired: materiStats.expired,
      total: materiStats.total,
      dokumen: dokumenCount,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error getting complete stats:", error);
    throw error;
  }
}

// Query 1: Jumlah Fitur
async function getFiturCount(filters: PaginationFilters): Promise<number> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(DISTINCT f.id) as fitur_count
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    AND f.id IS NOT NULL
  `;

  const [result] = await pool.query(query, queryParams);
  return (result as any[])[0].fitur_count || 0;
}

// Query 2: Materi Komunikasi, Aktif, dan Expired
async function getMateriStats(filters: PaginationFilters): Promise<{
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
}> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT 
      COUNT(DISTINCT m.id) as total,
      COUNT(DISTINCT CASE WHEN m.nama_materi IS NOT NULL AND m.nama_materi != '' THEN m.id END) as komunikasi,
      COUNT(DISTINCT CASE WHEN m.end_date > CURDATE() THEN m.id END) as aktif,
      COUNT(DISTINCT CASE WHEN m.end_date <= CURDATE() THEN m.id END) as expired
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
  `;

  const [result] = await pool.query(query, queryParams);
  const row = (result as any[])[0];

  return {
    komunikasi: row.komunikasi || 0,
    aktif: row.aktif || 0,
    expired: row.expired || 0,
    total: row.total || 0,
  };
}

// Query 3: Jumlah Dokumen
async function getDokumenCount(filters: PaginationFilters): Promise<number> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(DISTINCT dm.id) as dokumen_count
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    AND dm.id IS NOT NULL
  `;

  const [result] = await pool.query(query, queryParams);
  return (result as any[])[0].dokumen_count || 0;
}
