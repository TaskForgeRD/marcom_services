import { pool } from '../config/database';
import { Materi, DokumenMateri, DokumenMateriWithKeywords } from '../types';

export async function getAllMateri() {
  const [materiRows] = await pool.query(`
    SELECT m.*, b.name AS brand_name, c.name AS cluster_name
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
  `);
  
  return materiRows;
}

export async function getMateriById(id: number) {
  const [materiRows] = await pool.query(
    'SELECT * FROM materi WHERE id = ?',
    [id]
  );
  
  if (!materiRows || (materiRows as any[]).length === 0) {
    return null;
  }
  
  return (materiRows as any[])[0];
}

export async function createMateri(materi: Materi) {
  const [result] = await pool.execute(
    `INSERT INTO materi (brand_id, cluster_id, fitur, nama_materi, jenis, start_date, end_date, periode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
     WHERE id = ?`,
    [
      materi.brand_id,
      materi.cluster_id,
      materi.fitur,
      materi.nama_materi,
      materi.jenis,
      materi.start_date,
      materi.end_date,
      materi.periode,
      id
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
  await pool.execute('DELETE FROM dokumen_materi WHERE materi_id = ?', [materiId]);
}
