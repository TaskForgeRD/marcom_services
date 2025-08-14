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

function hideFieldValue(
  fields: Array<string>,
  key: string,
  value: any
): string {
  return fields.includes(key) ? "" : value;
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
        linkDokumen: hideFieldValue(
          hideFields,
          "link_dokumen",
          row.link_dokumen
        ),
        thumbnail: row.thumbnail,
        tipeMateri: row.tipe_materi,
        keywords: row.keywords ? row.keywords.split(",") : [],
      });
    }
  });

  return Array.from(materiMap.values());
}

export async function getPaginatedMateri(
  page: number = 1,
  limit: number = 10,
  filters: PaginationFilters = {},
  hideFields: Array<string> = []
): Promise<PaginatedResult> {
  const offset = (page - 1) * limit;

  // Build WHERE clause dynamically
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  // Search in nama_materi and keywords
  if (filters.search && filters.search.trim()) {
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

  // Status filter (aktif/expired)
  if (filters.status && filters.status.toLowerCase() !== "semua status") {
    if (filters.status.toLowerCase() === "aktif") {
      whereConditions.push(`m.end_date > CURDATE()`);
    } else if (filters.status.toLowerCase() === "expired") {
      whereConditions.push(`m.end_date <= CURDATE()`);
    }
  }

  // Brand filter
  if (filters.brand && !filters.brand.toLowerCase().includes("semua")) {
    whereConditions.push(`b.name = ?`);
    queryParams.push(filters.brand);
  }

  // Cluster filter
  if (filters.cluster && !filters.cluster.toLowerCase().includes("semua")) {
    whereConditions.push(`c.name = ?`);
    queryParams.push(filters.cluster);
  }

  // Fitur filter
  if (filters.fitur && !filters.fitur.toLowerCase().includes("semua")) {
    whereConditions.push(`f.name = ?`);
    queryParams.push(filters.fitur);
  }

  // Jenis filter
  if (filters.jenis && !filters.jenis.toLowerCase().includes("semua")) {
    whereConditions.push(`j.name = ?`);
    queryParams.push(filters.jenis);
  }

  // Date range filter
  if (filters.start_date) {
    whereConditions.push(`m.end_date >= ?`);
    queryParams.push(new Date(filters.start_date).toISOString().split("T")[0]);
  }

  if (filters.end_date) {
    whereConditions.push(`m.start_date <= ?`);
    queryParams.push(new Date(filters.end_date).toISOString().split("T")[0]);
  }

  // Only visual docs filter
  if (filters.only_visual_docs) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM dokumen_materi dm_visual 
      WHERE dm_visual.materi_id = m.id AND dm_visual.tipe_materi = 'Key Visual'
    )`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // FIXED: Get total count of unique materi (not documents)
  const countQuery = `
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

  const [countResult] = await pool.query(countQuery, queryParams);
  const total = (countResult as any[])[0].total;

  // FIXED: First get the materi IDs with pagination
  const materiIdsQuery = `
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

  const [materiIds] = await pool.query(materiIdsQuery, [
    ...queryParams,
    limit,
    offset,
  ]);
  const materiIdList = (materiIds as any[]).map((row) => row.id);

  if (materiIdList.length === 0) {
    return {
      data: [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // FIXED: Then get full data for these specific materi
  const placeholders = materiIdList.map(() => "?").join(",");
  const dataQuery = `
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

  const [rows] = await pool.query(dataQuery, materiIdList);
  const data = buildMateriFromRows(rows as any[], hideFields);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAllMateri(hideFields: Array<string> = []) {
  const [rows] = await pool.query(
    `
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
    GROUP BY m.id, dm.id
    ORDER BY m.created_at DESC
  `
  );

  return buildMateriFromRows(rows as any[], hideFields);
}

export async function getMateriById(
  id: number,
  hideFields: Array<string> = []
) {
  const [rows] = await pool.query(
    `
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
  `,
    [id]
  );

  if (!rows || (rows as any[]).length === 0) {
    return null;
  }

  const result = buildMateriFromRows(rows as any[], hideFields);
  return result.length > 0 ? result[0] : null;
}

export async function createMateri(materi: Materi) {
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

export async function updateMateri(id: number, materi: Materi) {
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

export async function deleteMateri(id: number) {
  const [result] = await pool.execute("DELETE FROM materi WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}

export async function getDokumenMateriByMateriId(materiId: number) {
  const [rows] = await pool.query(
    `
    SELECT 
      dm.*,
      GROUP_CONCAT(dmk.keyword) AS keywords
    FROM dokumen_materi dm
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    WHERE dm.materi_id = ?
    GROUP BY dm.id
  `,
    [materiId]
  );

  return (rows as any[]).map((row) => ({
    ...row,
    keywords: row.keywords ? row.keywords.split(",") : [],
  }));
}

export async function getKeywordsByDokumenId(dokumenId: number) {
  const [rows] = await pool.query(
    "SELECT keyword FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?",
    [dokumenId]
  );

  return (rows as any[]).map((row) => row.keyword);
}

export async function createDokumenMateri(dokumen: DokumenMateri) {
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

export async function createKeyword(dokumenId: number, keyword: string) {
  await pool.execute(
    `INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)`,
    [dokumenId, keyword]
  );
}

export async function updateDokumenKeywords(
  dokumenId: number,
  keywords: string[]
) {
  // Start transaction
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Delete existing keywords
    await connection.execute(
      "DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?",
      [dokumenId]
    );

    // Insert new keywords
    if (keywords.length > 0) {
      const values = keywords.map((keyword) => [dokumenId, keyword]);
      await connection.query(
        "INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES ?",
        [values]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteDokumenKeywords(dokumenId: number) {
  await pool.execute(
    "DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?",
    [dokumenId]
  );
}

export async function deleteDokumenByMateriId(materiId: number) {
  // CASCADE delete will handle this automatically, but explicit is better
  await pool.execute(
    `
    DELETE dmk FROM dokumen_materi_keyword dmk
    JOIN dokumen_materi dm ON dmk.dokumen_materi_id = dm.id
    WHERE dm.materi_id = ?
  `,
    [materiId]
  );

  await pool.execute("DELETE FROM dokumen_materi WHERE materi_id = ?", [
    materiId,
  ]);
}

// Helper functions for reference data
export async function getAllFitur() {
  const [rows] = await pool.query("SELECT * FROM fitur ORDER BY name");
  return rows as any[];
}

export async function getAllJenis() {
  const [rows] = await pool.query("SELECT * FROM jenis ORDER BY name");
  return rows as any[];
}

export async function getAllBrands() {
  const [rows] = await pool.query("SELECT * FROM brand ORDER BY name");
  return rows as any[];
}

export async function getAllClusters() {
  const [rows] = await pool.query("SELECT * FROM cluster ORDER BY name");
  return rows as any[];
}
