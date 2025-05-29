// models/materiModel.ts
import { pool } from '../config/database';
import { Materi, DokumenMateri } from '../types';

export async function getAllMateriByUser(userId: number) {
  const [rows] = await pool.query(`
    SELECT 
      m.*, 
      b.name AS brand_name, 
      c.name AS cluster_name,
      dm.id AS dokumen_id,
      dm.link_dokumen,
      dm.thumbnail,
      dm.tipe_materi,
      GROUP_CONCAT(dmk.keyword) AS keywords
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    WHERE m.user_id = ?
    GROUP BY m.id, dm.id
    ORDER BY m.created_at DESC
  `, [userId]);

  // Organisasi hasil ke dalam struktur nested
  const materiMap = new Map<number, any>();

  (rows as any[]).forEach(row => {
    if (!materiMap.has(row.id)) {
      materiMap.set(row.id, {
        id: row.id,
        user_id: row.user_id,
        brand_id: row.brand_id,
        brand_name: row.brand_name,
        cluster_id: row.cluster_id,
        cluster_name: row.cluster_name,
        fitur: row.fitur,
        nama_materi: row.nama_materi,
        jenis: row.jenis,
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
        linkDokumen: row.link_dokumen,
        thumbnail: row.thumbnail,
        tipeMateri: row.tipe_materi,
        keywords: row.keywords ? row.keywords.split(',') : [],
      });
    }
  });

  return Array.from(materiMap.values());
}

export async function getMateriById(id: number, userId: number) {
  const [materiRows] = await pool.query(
    'SELECT * FROM materi WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  
  if (!materiRows || (materiRows as any[]).length === 0) {
    return null;
  }
  
  return (materiRows as any[])[0];
}

export async function createMateri(materi: Materi) {
  const [result] = await pool.execute(
    `INSERT INTO materi (user_id, brand_id, cluster_id, fitur, nama_materi, jenis, start_date, end_date, periode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      materi.user_id,
      materi.brand_id, 
      materi.cluster_id, 
      materi.fitur, 
      materi.nama_materi, 
      materi.jenis, 
      materi.start_date, 
      materi.end_date, 
      materi.periode
    ]
  );
  
  return (result as any).insertId;
}

export async function updateMateri(id: number, materi: Materi) {
  await pool.execute(
    `UPDATE materi 
     SET brand_id = ?, cluster_id = ?, fitur = ?, nama_materi = ?, jenis = ?, 
         start_date = ?, end_date = ?, periode = ? 
     WHERE id = ? AND user_id = ?`,
    [
      materi.brand_id,
      materi.cluster_id,
      materi.fitur,
      materi.nama_materi,
      materi.jenis,
      materi.start_date,
      materi.end_date,
      materi.periode,
      id,
      materi.user_id
    ]
  );
}

export async function deleteMateri(id: number) {
  await pool.execute('DELETE FROM materi WHERE id = ?', [id]);
}

export async function getDokumenMateriByMateriId(materiId: number) {
  const [rows] = await pool.query(
    'SELECT * FROM dokumen_materi WHERE materi_id = ?',
    [materiId]
  );
  
  return rows as any[];
}

export async function getKeywordsByDokumenId(dokumenId: number) {
  const [rows] = await pool.query(
    'SELECT keyword FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?',
    [dokumenId]
  );
  
  return (rows as any[]).map(row => row.keyword);
}

export async function createDokumenMateri(dokumen: DokumenMateri) {
  const [result] = await pool.execute(
    `INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail)
     VALUES (?, ?, ?, ?)`,
    [dokumen.materi_id, dokumen.link_dokumen, dokumen.tipe_materi, dokumen.thumbnail]
  );
  
  return (result as any).insertId;
}

export async function createKeyword(dokumenId: number, keyword: string) {
  await pool.execute(
    `INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)`,
    [dokumenId, keyword]
  );
}

export async function deleteDokumenKeywords(dokumenId: number) {
  await pool.execute(
    'DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?',
    [dokumenId]
  );
}

export async function deleteDokumenByMateriId(materiId: number) {
  // First delete keywords
  await pool.execute(`
    DELETE dmk FROM dokumen_materi_keyword dmk
    JOIN dokumen_materi dm ON dmk.dokumen_materi_id = dm.id
    WHERE dm.materi_id = ?
  `, [materiId]);
  
  // Then delete documents
  await pool.execute('DELETE FROM dokumen_materi WHERE materi_id = ?', [materiId]);
}