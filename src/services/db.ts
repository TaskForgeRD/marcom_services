import { pool } from '../index';
import { 
  Brand, 
  Cluster, 
  Materi, 
  DokumenMateri, 
  DokumenMateriKeyword,
} from '../models';

// Brand database operations
export const brandService = {
  // Get all brands
  getAll: async (): Promise<Brand[]> => {
    const [rows] = await pool.query('SELECT * FROM brand');
    return rows as Brand[];
  },

  // Get brand by id
  getById: async (id: number): Promise<Brand | null> => {
    const [rows] = await pool.query('SELECT * FROM brand WHERE id = ?', [id]);
    const brands = rows as Brand[];
    return brands.length > 0 ? brands[0] : null;
  },

  // Get brand by name (or create if not exists)
  getOrCreate: async (name: string): Promise<Brand> => {
    const [rows] = await pool.query('SELECT * FROM brand WHERE name = ?', [name]);
    const brands = rows as Brand[];
    
    if (brands.length > 0) {
      return brands[0];
    }
    
    // Create new brand
    const [result]: any = await pool.query(
      'INSERT INTO brand (name) VALUES (?)',
      [name]
    );
    
    return { id: result.insertId, name };
  }
};

// Cluster database operations
export const clusterService = {
  // Get all clusters
  getAll: async (): Promise<Cluster[]> => {
    const [rows] = await pool.query('SELECT * FROM cluster');
    return rows as Cluster[];
  },

  // Get cluster by id
  getById: async (id: number): Promise<Cluster | null> => {
    const [rows] = await pool.query('SELECT * FROM cluster WHERE id = ?', [id]);
    const clusters = rows as Cluster[];
    return clusters.length > 0 ? clusters[0] : null;
  },

  // Get cluster by name (or create if not exists)
  getOrCreate: async (name: string): Promise<Cluster> => {
    const [rows] = await pool.query('SELECT * FROM cluster WHERE name = ?', [name]);
    const clusters = rows as Cluster[];
    
    if (clusters.length > 0) {
      return clusters[0];
    }
    
    // Create new cluster
    const [result]: any = await pool.query(
      'INSERT INTO cluster (name) VALUES (?)',
      [name]
    );
    
    return { id: result.insertId, name };
  }
};

// Materi database operations
export const materiService = {
  // Get all materi with related brand and cluster
  getAll: async (): Promise<Materi[]> => {
    const [rows] = await pool.query(`
      SELECT m.*, b.name as brand_name, c.name as cluster_name
      FROM materi m
      LEFT JOIN brand b ON m.brand_id = b.id
      LEFT JOIN cluster c ON m.cluster_id = c.id
    `);
    
    const materis = (rows as any[]).map(row => ({
      id: row.id,
      brand_id: row.brand_id,
      cluster_id: row.cluster_id,
      fitur: row.fitur,
      nama_materi: row.nama_materi,
      jenis: row.jenis,
      start_date: row.start_date,
      end_date: row.end_date,
      periode: row.periode,
      brand: { id: row.brand_id, name: row.brand_name },
      cluster: { id: row.cluster_id, name: row.cluster_name }
    }));
    
    return materis;
  },

  // Get materi by id with related documents and keywords
  getById: async (id: number): Promise<MateriWithDokumen | null> => {
    // Get materi with brand and cluster
    const [materiRows] = await pool.query(`
      SELECT m.*, b.name as brand_name, c.name as cluster_name
      FROM materi m
      LEFT JOIN brand b ON m.brand_id = b.id
      LEFT JOIN cluster c ON m.cluster_id = c.id
      WHERE m.id = ?
    `, [id]);
    
    const materis = (materiRows as any[]);
    if (materis.length === 0) return null;
    
    const materi = {
      id: materis[0].id,
      brand_id: materis[0].brand_id,
      cluster_id: materis[0].cluster_id,
      fitur: materis[0].fitur,
      nama_materi: materis[0].nama_materi,
      jenis: materis[0].jenis,
      start_date: materis[0].start_date,
      end_date: materis[0].end_date,
      periode: materis[0].periode,
      brand: { id: materis[0].brand_id, name: materis[0].brand_name },
      cluster: { id: materis[0].cluster_id, name: materis[0].cluster_name },
      dokumenMateri: []
    };
    
    // Get related documents
    const [dokumenRows] = await pool.query(`
      SELECT *
      FROM dokumen_materi
      WHERE materi_id = ?
    `, [id]);
    
    const dokumenMateris = (dokumenRows as DokumenMateri[]);
    
    // Get keywords for each document
    for (const dokumen of dokumenMateris) {
      const [keywordRows] = await pool.query(`
        SELECT keyword
        FROM dokumen_materi_keyword
        WHERE dokumen_materi_id = ?
      `, [dokumen.id]);
      
      const keywords = (keywordRows as any[]).map(row => row.keyword);
      
      materi.dokumenMateri.push({
        ...dokumen,
        keywords
      });
    }
    
    return materi;
  },

  // Create new materi
  create: async (materi: Materi): Promise<number> => {
    const [result]: any = await pool.query(
      `INSERT INTO materi 
       (brand_id, cluster_id, fitur, nama_materi, jenis, start_date, end_date, periode)
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
    
    return result.insertId;
  },

  // Update materi
  update: async (id: number, materi: Partial<Materi>): Promise<boolean> => {
    // Build dynamic query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    
    if (materi.brand_id !== undefined) {
      fields.push('brand_id = ?');
      values.push(materi.brand_id);
    }
    
    if (materi.cluster_id !== undefined) {
      fields.push('cluster_id = ?');
      values.push(materi.cluster_id);
    }
    
    if (materi.fitur !== undefined) {
      fields.push('fitur = ?');
      values.push(materi.fitur);
    }
    
    if (materi.nama_materi !== undefined) {
      fields.push('nama_materi = ?');
      values.push(materi.nama_materi);
    }
    
    if (materi.jenis !== undefined) {
      fields.push('jenis = ?');
      values.push(materi.jenis);
    }
    
    if (materi.start_date !== undefined) {
      fields.push('start_date = ?');
      values.push(materi.start_date);
    }
    
    if (materi.end_date !== undefined) {
      fields.push('end_date = ?');
      values.push(materi.end_date);
    }
    
    if (materi.periode !== undefined) {
      fields.push('periode = ?');
      values.push(materi.periode);
    }
    
    if (fields.length === 0) return false;
    
    // Add ID to values array
    values.push(id);
    
    const [result]: any = await pool.query(
      `UPDATE materi SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  },

  // Delete materi
  delete: async (id: number): Promise<boolean> => {
    // First delete related dokumen_materi_keywords
    const [dokumenRows] = await pool.query(
      'SELECT id FROM dokumen_materi WHERE materi_id = ?', 
      [id]
    );
    
    const dokumenIds = (dokumenRows as any[]).map(row => row.id);
    
    if (dokumenIds.length > 0) {
      await pool.query(
        `DELETE FROM dokumen_materi_keyword 
         WHERE dokumen_materi_id IN (?)`,
        [dokumenIds]
      );
    }
    
    // Delete related dokumen_materi
    await pool.query(
      'DELETE FROM dokumen_materi WHERE materi_id = ?',
      [id]
    );
    
    // Finally delete the materi
    const [result]: any = await pool.query(
      'DELETE FROM materi WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
};

// Dokumen Materi database operations
export const dokumenMateriService = {
  // Create new dokumen materi
  create: async (dokumen: DokumenMateri): Promise<number> => {
    const [result]: any = await pool.query(
      `INSERT INTO dokumen_materi 
       (materi_id, link_dokumen, tipe_materi, thumbnail)
       VALUES (?, ?, ?, ?)`,
      [
        dokumen.materi_id,
        dokumen.link_dokumen,
        dokumen.tipe_materi,
        dokumen.thumbnail
      ]
    );
    
    return result.insertId;
  },

  // Add keyword to dokumen materi
  addKeyword: async (keyword: DokumenMateriKeyword): Promise<number> => {
    const [result]: any = await pool.query(
      `INSERT INTO dokumen_materi_keyword 
       (dokumen_materi_id, keyword)
       VALUES (?, ?)`,
      [
        keyword.dokumen_materi_id,
        keyword.keyword
      ]
    );
    
    return result.insertId;
  },

  // Update dokumen materi
  update: async (id: number, dokumen: Partial<DokumenMateri>): Promise<boolean> => {
    // Build dynamic query based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    
    if (dokumen.link_dokumen !== undefined) {
      fields.push('link_dokumen = ?');
      values.push(dokumen.link_dokumen);
    }
    
    if (dokumen.tipe_materi !== undefined) {
      fields.push('tipe_materi = ?');
      values.push(dokumen.tipe_materi);
    }
    
    if (dokumen.thumbnail !== undefined) {
      fields.push('thumbnail = ?');
      values.push(dokumen.thumbnail);
    }
    
    if (fields.length === 0) return false;
    
    // Add ID to values array
    values.push(id);
    
    const [result]: any = await pool.query(
      `UPDATE dokumen_materi SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    return result.affectedRows > 0;
  },

  // Delete dokumen materi
  delete: async (id: number): Promise<boolean> => {
    // First delete related keywords
    await pool.query(
      'DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?',
      [id]
    );
    
    // Then delete the dokumen
    const [result]: any = await pool.query(
      'DELETE FROM dokumen_materi WHERE id = ?',
      [id]
    );
    
    return result.affectedRows > 0;
  }
};