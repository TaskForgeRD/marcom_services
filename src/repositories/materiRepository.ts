import { Database } from '../database';

export interface Materi {
  id?: number;
  brand_id: number;
  cluster_id: number;
  fitur: string;
  nama_materi: string;
  jenis: string;
  start_date: string;
  end_date: string;
  periode: string;
}

export interface DokumenMateri {
  id?: number;
  materi_id: number;
  link_dokumen: string;
  tipe_materi: string;
  thumbnail: string;
}

export interface DokumenMateriKeyword {
  id?: number;
  dokumen_materi_id: number;
  keyword: string;
}

export interface MateriComplete {
  id?: number;
  brand_id: number;
  brand?: string;
  cluster_id: number;
  cluster?: string;
  fitur: string;
  nama_materi: string;
  jenis: string;
  start_date: string;
  end_date: string;
  periode: string;
  dokumenMateri: {
    id?: number;
    link_dokumen: string;
    tipe_materi: string;
    thumbnail: string;
    keywords: string[];
  }[];
}

export class MateriRepository {
  private db: Database;

  constructor() {
    this.db = new Database();
  }

  async findAll(): Promise<MateriComplete[]> {
    const query = `
      SELECT 
        m.*, 
        b.name as brand, 
        c.name as cluster
      FROM materi m
      LEFT JOIN brand b ON m.brand_id = b.id
      LEFT JOIN cluster c ON m.cluster_id = c.id
    `;

    const materials = await this.db.query<any[]>(query);
    
    // Get all dokumen_materi and keywords for each materi
    const result: MateriComplete[] = [];
    
    for (const material of materials) {
      const dokumenQuery = `
        SELECT dm.* 
        FROM dokumen_materi dm 
        WHERE dm.materi_id = ?
      `;
      const documents = await this.db.query<DokumenMateri[]>(dokumenQuery, [material.id]);
      
      const documentWithKeywords = [];
      
      for (const doc of documents) {
        const keywordQuery = `
          SELECT keyword 
          FROM dokumen_materi_keyword 
          WHERE dokumen_materi_id = ?
        `;
        const keywords = await this.db.query<{keyword: string}[]>(keywordQuery, [doc.id]);
        
        documentWithKeywords.push({
          ...doc,
          keywords: keywords.map(k => k.keyword)
        });
      }
      
      result.push({
        ...material,
        dokumenMateri: documentWithKeywords
      });
    }
    
    return result;
  }

  async findById(id: number): Promise<MateriComplete | null> {
    const query = `
      SELECT 
        m.*, 
        b.name as brand, 
        c.name as cluster
      FROM materi m
      LEFT JOIN brand b ON m.brand_id = b.id
      LEFT JOIN cluster c ON m.cluster_id = c.id
      WHERE m.id = ?
    `;

    const materials = await this.db.query<any[]>(query, [id]);
    
    if (materials.length === 0) {
      return null;
    }
    
    const material = materials[0];
    
    // Get dokumen_materi for this materi
    const dokumenQuery = `
      SELECT * 
      FROM dokumen_materi 
      WHERE materi_id = ?
    `;
    const documents = await this.db.query<DokumenMateri[]>(dokumenQuery, [id]);
    
    const documentWithKeywords = [];
    
    for (const doc of documents) {
      const keywordQuery = `
        SELECT keyword 
        FROM dokumen_materi_keyword 
        WHERE dokumen_materi_id = ?
      `;
      const keywords = await this.db.query<{keyword: string}[]>(keywordQuery, [doc.id]);
      
      documentWithKeywords.push({
        ...doc,
        keywords: keywords.map(k => k.keyword)
      });
    }
    
    return {
      ...material,
      dokumenMateri: documentWithKeywords
    };
  }

  async create(materi: MateriComplete): Promise<MateriComplete> {
    const db = new Database();
    const pool = db.getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // Insert materi
      const materiResult = await conn.query(
        'INSERT INTO materi (brand_id, cluster_id, fitur, nama_materi, jenis, start_date, end_date, periode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
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
      const materiId = (materiResult[0] as any).insertId;
      
      // Insert dokumen_materi and keywords
      if (materi.dokumenMateri && materi.dokumenMateri.length > 0) {
        for (const dokumen of materi.dokumenMateri) {
          const dokumenResult = await conn.query(
            'INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail) VALUES (?, ?, ?, ?)',
            [materiId, dokumen.link_dokumen, dokumen.tipe_materi, dokumen.thumbnail]
          );
          const dokumenId = (dokumenResult[0] as any).insertId;
          
          // Insert keywords
          if (dokumen.keywords && dokumen.keywords.length > 0) {
            for (const keyword of dokumen.keywords) {
              await conn.query(
                'INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)',
                [dokumenId, keyword]
              );
            }
          }
        }
      }
      
      await conn.commit();
      
      // Return the created materi with all relations
      return this.findById(materiId) as Promise<MateriComplete>;
    } catch (error) {
      await conn.rollback();
      console.error('Error creating materi:', error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async update(id: number, materi: MateriComplete): Promise<boolean> {
    const db = new Database();
    const pool = db.getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // Update materi
      await conn.query(
        'UPDATE materi SET brand_id = ?, cluster_id = ?, fitur = ?, nama_materi = ?, jenis = ?, start_date = ?, end_date = ?, periode = ? WHERE id = ?',
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
      
      // Delete all existing dokumen and keywords
      const currentDokumen = await conn.query('SELECT id FROM dokumen_materi WHERE materi_id = ?', [id]);
      for (const dok of (currentDokumen[0] as any[])) {
        await conn.query('DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?', [dok.id]);
      }
      await conn.query('DELETE FROM dokumen_materi WHERE materi_id = ?', [id]);
      
      // Insert new dokumen_materi and keywords
      if (materi.dokumenMateri && materi.dokumenMateri.length > 0) {
        for (const dokumen of materi.dokumenMateri) {
          const dokumenResult = await conn.query(
            'INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail) VALUES (?, ?, ?, ?)',
            [id, dokumen.link_dokumen, dokumen.tipe_materi, dokumen.thumbnail]
          );
          const dokumenId = (dokumenResult[0] as any).insertId;
          
          // Insert keywords
          if (dokumen.keywords && dokumen.keywords.length > 0) {
            for (const keyword of dokumen.keywords) {
              await conn.query(
                'INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)',
                [dokumenId, keyword]
              );
            }
          }
        }
      }
      
      await conn.commit();
      return true;
    } catch (error) {
      await conn.rollback();
      console.error('Error updating materi:', error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async delete(id: number): Promise<boolean> {
    const db = new Database();
    const pool = db.getPool();
    const conn = await pool.getConnection();
    
    try {
      await conn.beginTransaction();
      
      // Delete all related dokumen_materi_keyword and dokumen_materi
      const currentDokumen = await conn.query('SELECT id FROM dokumen_materi WHERE materi_id = ?', [id]);
      for (const dok of (currentDokumen[0] as any[])) {
        await conn.query('DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?', [dok.id]);
      }
      await conn.query('DELETE FROM dokumen_materi WHERE materi_id = ?', [id]);
      
      // Delete materi
      const result = await conn.query('DELETE FROM materi WHERE id = ?', [id]);
      await conn.commit();
      
      return ((result[0] as any).affectedRows > 0);
    } catch (error) {
      await conn.rollback();
      console.error('Error deleting materi:', error);
      throw error;
    } finally {
      conn.release();
    }
  }
}