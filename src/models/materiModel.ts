import { pool } from "../config/database";
import {
  Materi,
  DokumenMateri,
  PaginationFilters,
  PaginatedResult,
} from "../types/";

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

// SOLUSI OPTIMASI: Hilangkan ORDER BY untuk mencapai O(n)
export async function findMateriIds(
  filters: PaginationFilters,
  limit: number,
  offset: number
): Promise<number[]> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  // Query tanpa ORDER BY = O(n) instead of O(n log n)
  const query = `
    SELECT DISTINCT m.id
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    LIMIT ? OFFSET ?
  `;

  const [result] = await pool.query(query, [...queryParams, limit, offset]);
  return (result as any[]).map((row) => row.id);
}

// Query 1: Ambil data materi utama berdasarkan IDs
export async function findMateriDataByIds(ids: number[]): Promise<any[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");

  const query = `
    SELECT 
      m.id,
      m.user_id,
      m.brand_id,
      b.name AS brand,
      m.cluster_id,
      c.name AS cluster,
      m.fitur_id,
      f.name AS fitur,
      m.jenis_id,
      j.name AS jenis,
      m.nama_materi,
      m.start_date,
      m.end_date,
      m.periode,
      m.created_at,
      m.updated_at
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    WHERE m.id IN (${placeholders})
    ORDER BY m.updated_at DESC, m.created_at DESC
  `;

  const [result] = await pool.query(query, ids);
  return result as any[];
}

// Query 2: Ambil semua dokumen materi berdasarkan materi IDs
export async function findDokumenMateriByMateriIds(
  materiIds: number[],
  hideFields: Array<string> = []
): Promise<any[]> {
  if (materiIds.length === 0) return [];

  const placeholders = materiIds.map(() => "?").join(",");

  const query = `
    SELECT 
      dm.materi_id,
      dm.id,
      ${
        hideFields.includes("link_dokumen") ? "''" : "dm.link_dokumen"
      } as linkDokumen,
      dm.thumbnail,
      dm.tipe_materi as tipeMateri
    FROM dokumen_materi dm
    WHERE dm.materi_id IN (${placeholders})
    ORDER BY dm.id
  `;

  const [result] = await pool.query(query, materiIds);
  return result as any[];
}

// Query 3: Ambil semua keywords berdasarkan materi IDs
export async function findKeywordsByMateriIds(
  materiIds: number[]
): Promise<any[]> {
  if (materiIds.length === 0) return [];

  const placeholders = materiIds.map(() => "?").join(",");

  const query = `
    SELECT 
      dm.materi_id,
      dmk.dokumen_materi_id,
      dmk.keyword
    FROM dokumen_materi_keyword dmk
    JOIN dokumen_materi dm ON dmk.dokumen_materi_id = dm.id
    WHERE dm.materi_id IN (${placeholders})
  `;

  const [result] = await pool.query(query, materiIds);
  return result as any[];
}

// Fungsi untuk menggabungkan semua data (kombinasi dari 3 query di atas)
export async function findMateriByIds(
  ids: number[],
  hideFields: Array<string> = []
): Promise<any[]> {
  if (ids.length === 0) return [];

  // Eksekusi 3 query secara paralel
  const [materiData, dokumenData, keywordData] = await Promise.all([
    findMateriDataByIds(ids),
    findDokumenMateriByMateriIds(ids, hideFields),
    findKeywordsByMateriIds(ids),
  ]);

  // Buat map untuk efisiensi lookup
  const dokumenMap = new Map<number, any[]>();
  const keywordMap = new Map<number, string[]>();

  // Group dokumen by materi_id
  dokumenData.forEach((doc) => {
    if (!dokumenMap.has(doc.materi_id)) {
      dokumenMap.set(doc.materi_id, []);
    }
    dokumenMap.get(doc.materi_id)!.push({
      id: doc.id,
      linkDokumen: doc.linkDokumen,
      thumbnail: doc.thumbnail,
      tipeMateri: doc.tipeMateri,
      keywords: [],
    });
  });

  // Group keywords by dokumen_materi_id
  keywordData.forEach((kw) => {
    if (!keywordMap.has(kw.dokumen_materi_id)) {
      keywordMap.set(kw.dokumen_materi_id, []);
    }
    keywordMap.get(kw.dokumen_materi_id)!.push(kw.keyword);
  });

  // Assign keywords ke dokumen yang sesuai
  dokumenMap.forEach((docs) => {
    docs.forEach((doc) => {
      doc.keywords = keywordMap.get(doc.id) || [];
    });
  });

  // Combine data - sudah terurut dari materiQuery
  return materiData.map((materi) => ({
    ...materi,
    dokumenMateri: dokumenMap.get(materi.id) || [],
  }));
}

export async function getMateriById(
  id: number,
  hideFields: Array<string> = []
) {
  // Menggunakan pendekatan yang sama untuk single record
  const result = await findMateriByIds([id], hideFields);
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
    `SELECT dm.*, JSON_ARRAYAGG(dmk.keyword) AS keywords
     FROM dokumen_materi dm
     LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
     WHERE dm.materi_id = ?
     GROUP BY dm.id`,
    [materiId]
  );

  return (rows as any[]).map((row) => ({
    ...row,
    keywords: row.keywords && row.keywords[0] !== null ? row.keywords : [],
  }));
}
