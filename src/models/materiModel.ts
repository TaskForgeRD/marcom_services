import { pool } from "../config/database";
import { Materi, DokumenMateri } from "../types";

function buildMateriFromRows(rows: any[]) {
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

    // Tambahkan dokumen jika ada
    if (row.dokumen_id) {
      materiMap.get(row.id).dokumenMateri.push({
        id: row.dokumen_id,
        linkDokumen: row.link_dokumen,
        thumbnail: row.thumbnail,
        tipeMateri: row.tipe_materi,
        keywords: row.keywords ? row.keywords.split(",") : [],
      });
    }
  });

  return Array.from(materiMap.values());
}

export async function getAllMateriByUser(userId: number) {
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
    WHERE m.user_id = ?
    GROUP BY m.id, dm.id
    ORDER BY m.created_at DESC
  `,
    [userId]
  );

  return buildMateriFromRows(rows as any[]);
}

export async function getMateriById(id: number, userId: number) {
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
    WHERE m.id = ? AND m.user_id = ?
    GROUP BY m.id, dm.id
  `,
    [id, userId]
  );

  if (!rows || (rows as any[]).length === 0) {
    return null;
  }

  const result = buildMateriFromRows(rows as any[]);
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

export async function deleteMateri(id: number, userId: number) {
  // Add user_id check for security
  const [result] = await pool.execute(
    "DELETE FROM materi WHERE id = ? AND user_id = ?",
    [id, userId]
  );

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

export async function isNamaMateriExist(nama: string, userId: number) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM materi WHERE nama_materi = ? AND user_id = ?",
    [nama, userId]
  );

  return (rows as any)[0].count > 0;
}
