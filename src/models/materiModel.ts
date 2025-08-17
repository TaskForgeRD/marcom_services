import { pool } from "../config/database";
import { Materi, DokumenMateri } from "../types/";

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
}

function buildMateriFromRows(rows: any[], hideFields: Array<string> = []) {
  const materiMap = new Map<number, any>();

  rows.forEach((row) => {
    if (!materiMap.has(row.id)) {
      materiMap.set(row.id, {
        id: row.id,
        user_id: row.user_id,
        brand_id: row.brand_id,
        brand: row.brand_name,
        cluster_id: row.cluster_id,
        cluster: row.cluster_name,
        fitur_id: row.fitur_id,
        fitur: row.fitur_name,
        jenis_id: row.jenis_id,
        jenis: row.jenis_name,
        nama_materi: row.nama_materi,
        start_date: row.start_date,
        end_date: row.end_date,
        periode: row.periode,
        created_at: row.created_at,
        updated_at: row.updated_at,
        dokumenMateri: [],
      });
    }

    if (row.dokumen_id) {
      materiMap.get(row.id).dokumenMateri.push({
        id: row.dokumen_id,
        linkDokumen: hideFields.includes("link_dokumen")
          ? ""
          : row.link_dokumen,
        thumbnail: row.thumbnail,
        tipeMateri: row.tipe_materi,
        keywords: row.keywords ? row.keywords.split(",") : [],
      });
    }
  });

  return Array.from(materiMap.values());
}

function buildWhereClause(
  filters: PaginationFilters,
  excludeExpired: boolean = true
): {
  whereClause: string;
  queryParams: any[];
} {
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (excludeExpired) {
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
      if (!excludeExpired) {
        whereConditions.push(`m.end_date > CURDATE()`);
      }
    } else if (filters.status.toLowerCase() === "expired") {
      if (excludeExpired) {
        const expiredConditionIndex = whereConditions.findIndex((condition) =>
          condition.includes("m.end_date > CURDATE()")
        );
        if (expiredConditionIndex !== -1) {
          whereConditions.splice(expiredConditionIndex, 1);
        }
      }
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

export async function countMateri(filters: PaginationFilters): Promise<number> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(DISTINCT m.id) as total
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
  return (result as any[])[0].total;
}

export async function findMateriIds(
  filters: PaginationFilters,
  limit: number,
  offset: number
): Promise<number[]> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT DISTINCT m.id, m.updated_at, m.created_at
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    ORDER BY m.updated_at DESC, m.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [result] = await pool.query(query, [...queryParams, limit, offset]);
  return (result as any[]).map((row) => row.id);
}

export async function findMateriByIds(
  ids: number[],
  hideFields: Array<string> = []
): Promise<any[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");

  const query = `
    SELECT 
      m.*, 
      b.name AS brand_name, 
      c.name AS cluster_name,
      f.name AS fitur_name,
      j.name AS jenis_name,
      dm.id AS dokumen_id,
      dm.link_dokumen,
      dm.thumbnail,
      dm.tipe_materi,
      GROUP_CONCAT(DISTINCT dmk.keyword) AS keywords
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    WHERE m.id IN (${placeholders})
    GROUP BY m.id, dm.id
    ORDER BY m.updated_at DESC, m.created_at DESC
  `;

  const [rows] = await pool.query(query, ids);
  return buildMateriFromRows(rows as any[], hideFields);
}

export async function calculateStats(
  filters: PaginationFilters
): Promise<StatsResult> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT 
      COUNT(DISTINCT m.id) as total,
      COUNT(DISTINCT CASE WHEN m.end_date > CURDATE() THEN m.id END) as aktif,
      COUNT(DISTINCT CASE WHEN m.end_date <= CURDATE() THEN m.id END) as expired,
      COUNT(DISTINCT CASE WHEN f.id IS NOT NULL THEN m.id END) as fitur,
      COUNT(DISTINCT CASE WHEN m.nama_materi IS NOT NULL AND m.nama_materi != '' THEN m.id END) as komunikasi,
      COUNT(DISTINCT CASE WHEN dm.id IS NOT NULL THEN m.id END) as dokumen
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
    total: row.total,
    aktif: row.aktif,
    expired: row.expired,
    fitur: row.fitur,
    komunikasi: row.komunikasi,
    dokumen: row.dokumen,
  };
}

export async function getMateriById(
  id: number,
  hideFields: Array<string> = []
) {
  const query = `
    SELECT 
      m.*, 
      b.name AS brand_name, 
      c.name AS cluster_name,
      f.name AS fitur_name,
      j.name AS jenis_name,
      dm.id AS dokumen_id,
      dm.link_dokumen,
      dm.thumbnail,
      dm.tipe_materi,
      GROUP_CONCAT(dmk.keyword) AS keywords
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    WHERE m.id = ?
    GROUP BY m.id, dm.id
  `;

  const [rows] = await pool.query(query, [id]);
  if (!rows || (rows as any[]).length === 0) return null;

  const result = buildMateriFromRows(rows as any[], hideFields);
  return result.length > 0 ? result[0] : null;
}

export async function createMateri(materi: Materi): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO materi (user_id, brand_id, cluster_id, fitur_id, nama_materi, jenis_id, start_date, end_date, periode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      materi.user_id,
      materi.brand_id,
      materi.cluster_id,
      materi.fitur_id,
      materi.nama_materi,
      materi.jenis_id,
      materi.start_date,
      materi.end_date,
      materi.periode,
    ]
  );

  return (result as any).insertId;
}

export async function updateMateri(
  id: number,
  materi: Materi
): Promise<boolean> {
  const [result] = await pool.execute(
    `UPDATE materi 
     SET brand_id = ?, cluster_id = ?, fitur_id = ?, nama_materi = ?, jenis_id = ?, 
         start_date = ?, end_date = ?, periode = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [
      materi.brand_id,
      materi.cluster_id,
      materi.fitur_id,
      materi.nama_materi,
      materi.jenis_id,
      materi.start_date,
      materi.end_date,
      materi.periode,
      id,
      materi.user_id,
    ]
  );

  return (result as any).affectedRows > 0;
}

export async function deleteMateri(id: number): Promise<boolean> {
  const [result] = await pool.execute("DELETE FROM materi WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}

export async function createDokumenMateri(
  dokumen: DokumenMateri
): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail)
     VALUES (?, ?, ?, ?)`,
    [
      dokumen.materi_id,
      dokumen.link_dokumen,
      dokumen.tipe_materi,
      dokumen.thumbnail,
    ]
  );

  return (result as any).insertId;
}

export async function createKeyword(
  dokumenId: number,
  keyword: string
): Promise<void> {
  await pool.execute(
    `INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)`,
    [dokumenId, keyword]
  );
}

export async function deleteDokumenByMateriId(materiId: number): Promise<void> {
  await pool.execute(
    `DELETE dmk FROM dokumen_materi_keyword dmk
     JOIN dokumen_materi dm ON dmk.dokumen_materi_id = dm.id
     WHERE dm.materi_id = ?`,
    [materiId]
  );

  await pool.execute("DELETE FROM dokumen_materi WHERE materi_id = ?", [
    materiId,
  ]);
}

export async function getDokumenMateriByMateriId(
  materiId: number
): Promise<any[]> {
  const [rows] = await pool.query(
    `SELECT dm.*, GROUP_CONCAT(dmk.keyword) AS keywords
     FROM dokumen_materi dm
     LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
     WHERE dm.materi_id = ?
     GROUP BY dm.id`,
    [materiId]
  );

  return (rows as any[]).map((row) => ({
    ...row,
    keywords: row.keywords ? row.keywords.split(",") : [],
  }));
}
