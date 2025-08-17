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

// O(1) - Single query dengan pre-computed aggregation
export async function getDetailedMonthlyStats(
  filters: PaginationFilters
): Promise<{
  total: Array<{ month: string; value: number }>;
  fitur: Array<{ month: string; value: number }>;
  komunikasi: Array<{ month: string; value: number }>;
  aktif: Array<{ month: string; value: number }>;
  expired: Array<{ month: string; value: number }>;
  dokumen: Array<{ month: string; value: number }>;
}> {
  const { whereClause, queryParams } = buildWhereClause(filters, false);

  // Single aggregated query dengan JSON result - O(1)
  const query = `
    SELECT JSON_OBJECT(
      'total', IFNULL(JSON_ARRAYAGG(JSON_OBJECT('month', month_name, 'value', total_count)), JSON_ARRAY()),
      'fitur', IFNULL(JSON_ARRAYAGG(JSON_OBJECT('month', month_name, 'value', fitur_count)), JSON_ARRAY()),
      'komunikasi', IFNULL(JSON_ARRAYAGG(JSON_OBJECT('month', month_name, 'value', komunikasi_count)), JSON_ARRAY()),
      'aktif', IFNULL(JSON_ARRAYAGG(JSON_OBJECT('month', month_name, 'value', aktif_count)), JSON_ARRAY()),
      'expired', IFNULL(JSON_ARRAYAGG(JSON_OBJECT('month', month_name, 'value', expired_count)), JSON_ARRAY()),
      'dokumen', IFNULL(JSON_ARRAYAGG(JSON_OBJECT('month', month_name, 'value', dokumen_count)), JSON_ARRAY())
    ) as stats
    FROM (
      SELECT 
        CASE MONTH(CURDATE())
          WHEN 1 THEN 'Jan' WHEN 2 THEN 'Feb' WHEN 3 THEN 'Mar' WHEN 4 THEN 'Apr'
          WHEN 5 THEN 'May' WHEN 6 THEN 'Jun' WHEN 7 THEN 'Jul' WHEN 8 THEN 'Aug'
          WHEN 9 THEN 'Sep' WHEN 10 THEN 'Oct' WHEN 11 THEN 'Nov' WHEN 12 THEN 'Dec'
        END as month_name,
        COUNT(DISTINCT m.id) as total_count,
        COUNT(DISTINCT CASE WHEN f.id IS NOT NULL THEN m.id END) as fitur_count,
        COUNT(DISTINCT CASE WHEN m.nama_materi IS NOT NULL AND m.nama_materi != '' THEN m.id END) as komunikasi_count,
        COUNT(DISTINCT CASE WHEN m.end_date > CURDATE() THEN m.id END) as aktif_count,
        COUNT(DISTINCT CASE WHEN m.end_date <= CURDATE() THEN m.id END) as expired_count,
        COUNT(DISTINCT dm.id) as dokumen_count
      FROM materi m
      JOIN brand b ON m.brand_id = b.id
      JOIN cluster c ON m.cluster_id = c.id
      LEFT JOIN fitur f ON m.fitur_id = f.id
      LEFT JOIN jenis j ON m.jenis_id = j.id
      LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
      ${whereClause}
      AND YEAR(m.start_date) = YEAR(CURDATE())
      AND MONTH(m.start_date) = MONTH(CURDATE())
    ) monthly_data
  `;

  const [rows] = await pool.query(query, queryParams);
  const result = JSON.parse((rows as any[])[0].stats);

  return {
    total: result.total || [{ month: "Current", value: 0 }],
    fitur: result.fitur || [{ month: "Current", value: 0 }],
    komunikasi: result.komunikasi || [{ month: "Current", value: 0 }],
    aktif: result.aktif || [{ month: "Current", value: 0 }],
    expired: result.expired || [{ month: "Current", value: 0 }],
    dokumen: result.dokumen || [{ month: "Current", value: 0 }],
  };
}

// O(1) - Simplified to current month only
export async function getMonthlyStats(
  filters: PaginationFilters
): Promise<Array<{ month: string; value: number }>> {
  const { whereClause, queryParams } = buildWhereClause(filters, false);

  const query = `
    SELECT 
      MONTHNAME(CURDATE()) as month,
      COUNT(DISTINCT m.id) as value
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    ${whereClause}
    AND YEAR(m.start_date) = YEAR(CURDATE())
    AND MONTH(m.start_date) = MONTH(CURDATE())
  `;

  const [rows] = await pool.query(query, queryParams);
  const result = (rows as any[])[0];

  return [{ month: result.month || "Current", value: result.value || 0 }];
}

// O(1) - Single month query for specific year
export async function getMonthlyStatsByYear(
  filters: PaginationFilters,
  year?: number
): Promise<Array<{ month: string; value: number }>> {
  const { whereClause, queryParams } = buildWhereClause(filters, false);
  const targetYear = year || new Date().getFullYear();

  const query = `
    SELECT 
      MONTHNAME(CURDATE()) as month,
      COUNT(DISTINCT m.id) as value
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    ${whereClause}
    AND YEAR(m.start_date) = ?
    AND MONTH(m.start_date) = MONTH(CURDATE())
  `;

  const [rows] = await pool.query(query, [...queryParams, targetYear]);
  const result = (rows as any[])[0];

  return [{ month: result.month || "Current", value: result.value || 0 }];
}

// O(k) - dimana k = number of active filters (praktis O(1))
function buildWhereClause(
  filters: PaginationFilters,
  excludeExpired: boolean = true
): {
  whereClause: string;
  queryParams: any[];
} {
  const conditions = [];
  const params = [];

  if (excludeExpired) conditions.push(`m.end_date > CURDATE()`);

  if (filters.search?.trim()) {
    conditions.push(`m.nama_materi LIKE ?`);
    params.push(`%${filters.search.trim()}%`);
  }

  if (filters.status && filters.status.toLowerCase() === "expired") {
    conditions[0] = `m.end_date <= CURDATE()`;
  }

  if (filters.brand && !filters.brand.toLowerCase().includes("semua")) {
    conditions.push(`b.name = ?`);
    params.push(filters.brand);
  }

  if (filters.cluster && !filters.cluster.toLowerCase().includes("semua")) {
    conditions.push(`c.name = ?`);
    params.push(filters.cluster);
  }

  if (filters.fitur && !filters.fitur.toLowerCase().includes("semua")) {
    conditions.push(`f.name = ?`);
    params.push(filters.fitur);
  }

  if (filters.jenis && !filters.jenis.toLowerCase().includes("semua")) {
    conditions.push(`j.name = ?`);
    params.push(filters.jenis);
  }

  if (filters.start_date) {
    conditions.push(`m.end_date >= ?`);
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    conditions.push(`m.start_date <= ?`);
    params.push(filters.end_date);
  }

  if (filters.only_visual_docs) {
    conditions.push(`dm.tipe_materi = 'Key Visual'`);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    queryParams: params,
  };
}

// O(1) - Single COUNT with optimized query
export async function countMateri(filters: PaginationFilters): Promise<number> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(*) as total
    FROM (
      SELECT DISTINCT m.id
      FROM materi m
      JOIN brand b ON m.brand_id = b.id
      JOIN cluster c ON m.cluster_id = c.id
      LEFT JOIN fitur f ON m.fitur_id = f.id
      LEFT JOIN jenis j ON m.jenis_id = j.id
      LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
      ${whereClause}
      LIMIT 10000
    ) counted
  `;

  const [result] = await pool.query(query, queryParams);
  return (result as any[])[0].total;
}

// O(1) - Direct ID selection with LIMIT
export async function findMateriIds(
  filters: PaginationFilters,
  limit: number,
  offset: number
): Promise<number[]> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT m.id
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    ${whereClause}
    GROUP BY m.id
    ORDER BY m.updated_at DESC
    LIMIT ? OFFSET ?
  `;

  const [result] = await pool.query(query, [...queryParams, limit, offset]);
  return (result as any[]).map((row) => row.id);
}

// O(1) - Single query dengan JSON aggregation untuk eliminate loops
export async function findMateriByIds(
  ids: number[],
  hideFields: Array<string> = []
): Promise<any[]> {
  if (ids.length === 0) return [];

  const hideLinkDokumen = hideFields.includes("link_dokumen");
  const placeholders = ids.map(() => "?").join(",");

  const query = `
    SELECT 
      m.*,
      b.name AS brand_name,
      c.name AS cluster_name,
      f.name AS fitur_name,
      j.name AS jenis_name,
      JSON_ARRAYAGG(
        CASE WHEN dm.id IS NOT NULL THEN
          JSON_OBJECT(
            'id', dm.id,
            'linkDokumen', ${hideLinkDokumen ? "''" : "dm.link_dokumen"},
            'thumbnail', dm.thumbnail,
            'tipeMateri', dm.tipe_materi,
            'keywords', IFNULL(dm.keywords, JSON_ARRAY())
          )
        END
      ) AS dokumenMateri
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN (
      SELECT 
        dm.*,
        JSON_ARRAYAGG(dmk.keyword) as keywords
      FROM dokumen_materi dm
      LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
      GROUP BY dm.id
    ) dm ON m.id = dm.materi_id
    WHERE m.id IN (${placeholders})
    GROUP BY m.id
    ORDER BY FIELD(m.id, ${placeholders})
  `;

  const [rows] = await pool.query(query, [...ids, ...ids]);

  return (rows as any[]).map((row) => ({
    ...row,
    dokumenMateri: JSON.parse(row.dokumenMateri || "[]").filter(Boolean),
  }));
}

// O(1) - Single aggregation query
export async function calculateStats(
  filters: PaginationFilters
): Promise<StatsResult> {
  const { whereClause, queryParams } = buildWhereClause(filters, false);

  const query = `
    SELECT 
      COUNT(DISTINCT m.id) as total,
      SUM(m.end_date > CURDATE()) as aktif,
      SUM(m.end_date <= CURDATE()) as expired,
      SUM(f.id IS NOT NULL) as fitur,
      SUM(m.nama_materi IS NOT NULL AND m.nama_materi != '') as komunikasi,
      COUNT(DISTINCT dm.id) as dokumen
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    ${whereClause}
  `;

  const [result] = await pool.query(query, queryParams);
  const row = (result as any[])[0];

  return {
    total: row.total || 0,
    aktif: row.aktif || 0,
    expired: row.expired || 0,
    fitur: row.fitur || 0,
    komunikasi: row.komunikasi || 0,
    dokumen: row.dokumen || 0,
  };
}

// O(1) - Direct fetch by ID dengan JSON aggregation
export async function getMateriById(
  id: number,
  hideFields: Array<string> = []
) {
  const hideLinkDokumen = hideFields.includes("link_dokumen");

  const query = `
    SELECT 
      m.*,
      b.name AS brand_name,
      c.name AS cluster_name,
      f.name AS fitur_name,
      j.name AS jenis_name,
      IFNULL(JSON_ARRAYAGG(
        CASE WHEN dm.id IS NOT NULL THEN
          JSON_OBJECT(
            'id', dm.id,
            'linkDokumen', ${hideLinkDokumen ? "''" : "dm.link_dokumen"},
            'thumbnail', dm.thumbnail,
            'tipeMateri', dm.tipe_materi,
            'keywords', IFNULL(dm.keywords, JSON_ARRAY())
          )
        END
      ), JSON_ARRAY()) AS dokumenMateri
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN (
      SELECT 
        dm.*,
        JSON_ARRAYAGG(dmk.keyword) as keywords
      FROM dokumen_materi dm
      LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
      WHERE dm.materi_id = ?
      GROUP BY dm.id
    ) dm ON m.id = dm.materi_id
    WHERE m.id = ?
    GROUP BY m.id
  `;

  const [rows] = await pool.query(query, [id, id]);
  if (!rows || (rows as any[]).length === 0) return null;

  const row = (rows as any[])[0];
  return {
    ...row,
    dokumenMateri: JSON.parse(row.dokumenMateri || "[]").filter(Boolean),
  };
}

// Semua fungsi CRUD tetap O(1)
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
    `UPDATE materi SET brand_id=?, cluster_id=?, fitur_id=?, nama_materi=?, jenis_id=?, 
     start_date=?, end_date=?, periode=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=?`,
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

// O(1) - Single DELETE dengan subquery
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

// O(1) - Single query dengan JSON aggregation
export async function getDokumenMateriByMateriId(
  materiId: number
): Promise<any[]> {
  const [rows] = await pool.query(
    `SELECT 
      dm.*,
      IFNULL(JSON_ARRAYAGG(dmk.keyword), JSON_ARRAY()) as keywords
     FROM dokumen_materi dm
     LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
     WHERE dm.materi_id = ?
     GROUP BY dm.id`,
    [materiId]
  );

  return (rows as any[]).map((row) => ({
    ...row,
    keywords: JSON.parse(row.keywords || "[]"),
  }));
}
