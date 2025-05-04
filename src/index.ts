// src/index.ts
import { Elysia, t } from 'elysia';
import * as mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Database connection
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Utility function to save uploaded file
async function saveFile(file: any): Promise<string> {
  if (!file) return '';
  
  const fileExtension = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = path.join(uploadDir, fileName);
  
  await fs.promises.writeFile(filePath, await file.arrayBuffer());
  return fileName;
}

// Model types
type Materi = {
  id?: number;
  brand_id: number;
  cluster_id: number;
  fitur: string;
  nama_materi: string;
  jenis: string;
  start_date: string;
  end_date: string;
  periode: string;
};

type DokumenMateri = {
  id?: number;
  materi_id: number;
  link_dokumen: string;
  tipe_materi: string;
  thumbnail: string;
};

type DokumenMateriKeyword = {
  id?: number;
  dokumen_materi_id: number;
  keyword: string;
};

// API
const app = new Elysia()
  .use(async app => {
    // Enable CORS
    app.onRequest(({ request, set }) => {
      if (request.method === 'OPTIONS') {
        set.status = 204;
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] = 'Content-Type';
        return new Response(null);
      }
      set.headers['Access-Control-Allow-Origin'] = '*';
    });
    return app;
  })
  // Get all brands
  .get('/api/brands', async () => {
    const [rows] = await pool.query('SELECT * FROM brand');
    return rows;
  })
  // Get all clusters
  .get('/api/clusters', async () => {
    const [rows] = await pool.query('SELECT * FROM cluster');
    return rows;
  })
  // Get all materi
  .get('/api/materi', async () => {
    const [rows] = await pool.query(`
      SELECT m.*, b.name as brand_name, c.name as cluster_name 
      FROM materi m 
      JOIN brand b ON m.brand_id = b.id 
      JOIN cluster c ON m.cluster_id = c.id
    `);
    return rows;
  })
  // Get materi by ID with documents and keywords
  .get('/api/materi/:id', async ({ params: { id } }) => {
    // Get materi
    const [materiRows] = await pool.query(
      'SELECT * FROM materi WHERE id = ?',
      [id]
    );
    
    if (!materiRows || (materiRows as any[]).length === 0) {
      return { status: 404, message: 'Materi tidak ditemukan' };
    }
    
    const materi = (materiRows as any[])[0];
    
    // Get documents
    const [dokumenRows] = await pool.query(
      'SELECT * FROM dokumen_materi WHERE materi_id = ?',
      [id]
    );
    
    const dokumenMateri = await Promise.all((dokumenRows as any[]).map(async (dokumen) => {
      // Get keywords for each document
      const [keywordRows] = await pool.query(
        'SELECT keyword FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?',
        [dokumen.id]
      );
      
      const keywords = (keywordRows as any[]).map(k => k.keyword);
      
      return {
        ...dokumen,
        keywords
      };
    }));
    
    return {
      ...materi,
      dokumenMateri
    };
  })
  // Create new materi
app.post('/api/materi', async ({ request, set }) => {
  try {
    const formData = await request.formData();

    // Ambil data utama materi
    const brand = formData.get('brand') as string;
    const cluster = formData.get('cluster') as string;
    const fitur = formData.get('fitur') as string;
    const namaMateri = formData.get('namaMateri') as string;
    const jenis = formData.get('jenis') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const periode = formData.get('periode') as string;

    // Validasi brand & cluster ID
    const [brandRows] = await pool.query('SELECT id FROM brand WHERE name = ?', [brand]);
    const brandId = (brandRows as any[])[0]?.id;

    const [clusterRows] = await pool.query('SELECT id FROM cluster WHERE name = ?', [cluster]);
    const clusterId = (clusterRows as any[])[0]?.id;

    if (!brandId || !clusterId) {
      set.status = 400;
      return { success: false, message: 'Brand atau Cluster tidak valid' };
    }

    // Simpan ke tabel materi
    const [result] = await pool.execute(
      `INSERT INTO materi (brand_id, cluster_id, fitur, nama_materi, jenis, start_date, end_date, periode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [brandId, clusterId, fitur, namaMateri, jenis, startDate, endDate, periode]
    );

    const materiId = (result as any).insertId;

    // Tangani dokumenMateri
    const dokumenCount = parseInt(formData.get('dokumenMateriCount') as string) || 0;

    for (let i = 0; i < dokumenCount; i++) {
      const linkDokumen = formData.get(`dokumenMateri[${i}][linkDokumen]`) as string;
      const tipeMateri = formData.get(`dokumenMateri[${i}][tipeMateri]`) as string;
      const keywordsRaw = formData.get(`dokumenMateri[${i}][keywords]`) as string;
      const thumbnail = formData.get(`dokumenMateri[${i}][thumbnail]`) as File;

      let thumbnailFileName = '';
      if (thumbnail && thumbnail.size > 0) {
        const fileBuffer = await thumbnail.arrayBuffer();
        const ext = thumbnail.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const filePath = path.join(uploadDir, fileName);

        await fs.promises.writeFile(filePath, Buffer.from(fileBuffer));
        thumbnailFileName = fileName;
      }

      const [dokumenResult] = await pool.execute(
        `INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail)
         VALUES (?, ?, ?, ?)`,
        [materiId, linkDokumen, tipeMateri, thumbnailFileName]
      );

      const dokumenId = (dokumenResult as any).insertId;

      // Simpan keywords
      const keywords = JSON.parse(keywordsRaw || '[]');
      for (const keyword of keywords) {
        if (keyword) {
          await pool.execute(
            `INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)`,
            [dokumenId, keyword]
          );
        }
      }
    }

    const [newMateri] = await pool.query('SELECT * FROM materi WHERE id = ?', [materiId]);

    return { success: true, _id: materiId, ...(newMateri as any[])[0] };
  } catch (error) {
    console.error('Error creating materi:', error);
    set.status = 500;
    return { success: false, message: 'Gagal menyimpan data' };
  }
})
  // Update materi
  .put('/api/materi/:id', async ({ params: { id }, body, set }) => {
    try {
      const formData = body as FormData;
      
      // Extract materi data
      const brand = formData.get('brand') as string;
      const cluster = formData.get('cluster') as string;
      const fitur = formData.get('fitur') as string;
      const namaMateri = formData.get('namaMateri') as string;
      const jenis = formData.get('jenis') as string;
      const startDate = formData.get('startDate') as string;
      const endDate = formData.get('endDate') as string;
      const periode = formData.get('periode') as string;
      
      // Find brand and cluster IDs
      const [brandRows] = await pool.query('SELECT id FROM brand WHERE name = ?', [brand]);
      const brandId = (brandRows as any[])[0]?.id;
      
      const [clusterRows] = await pool.query('SELECT id FROM cluster WHERE name = ?', [cluster]);
      const clusterId = (clusterRows as any[])[0]?.id;
      
      if (!brandId || !clusterId) {
        set.status = 400;
        return { success: false, message: 'Brand atau Cluster tidak valid' };
      }
      
      // Update materi
      await pool.execute(
        `UPDATE materi 
         SET brand_id = ?, cluster_id = ?, fitur = ?, nama_materi = ?, jenis = ?, 
             start_date = ?, end_date = ?, periode = ? 
         WHERE id = ?`,
        [brandId, clusterId, fitur, namaMateri, jenis, startDate, endDate, periode, id]
      );
      
      // Delete existing dokumen and keywords
      const [dokumenRows] = await pool.query(
        'SELECT id FROM dokumen_materi WHERE materi_id = ?',
        [id]
      );
      
      for (const dokumen of (dokumenRows as any[])) {
        await pool.execute(
          'DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?',
          [dokumen.id]
        );
      }
      
      await pool.execute('DELETE FROM dokumen_materi WHERE materi_id = ?', [id]);
      
      // Process dokumen materi
      const dokumenCount = parseInt(formData.get('dokumenMateriCount') as string) || 0;
      
      for (let i = 0; i < dokumenCount; i++) {
        const linkDokumen = formData.get(`dokumenMateri[${i}][linkDokumen]`) as string;
        const tipeMateri = formData.get(`dokumenMateri[${i}][tipeMateri]`) as string;
        const thumbnail = formData.get(`dokumenMateri[${i}][thumbnail]`) as File;
        
        let thumbnailFileName = '';
        if (thumbnail && thumbnail.size > 0) {
          thumbnailFileName = await saveFile(thumbnail);
        }
        
        // Insert dokumen
        const [dokumenResult] = await pool.execute(
          `INSERT INTO dokumen_materi (materi_id, link_dokumen, tipe_materi, thumbnail) 
           VALUES (?, ?, ?, ?)`,
          [id, linkDokumen, tipeMateri, thumbnailFileName]
        );
        
        const dokumenId = (dokumenResult as any).insertId;
        
        // Insert keywords
        const keywordsJSON = formData.get(`dokumenMateri[${i}][keywords]`) as string;
        const keywords = JSON.parse(keywordsJSON);
        
        for (const keyword of keywords) {
          if (keyword) {
            await pool.execute(
              `INSERT INTO dokumen_materi_keyword (dokumen_materi_id, keyword) VALUES (?, ?)`,
              [dokumenId, keyword]
            );
          }
        }
      }
      
      // Get the updated materi
      const [updatedMateriRows] = await pool.query(
        'SELECT * FROM materi WHERE id = ?',
        [id]
      );
      
      return { success: true, _id: id, ...((updatedMateriRows as any[])[0]) };
    } catch (error) {
      console.error('Error updating materi:', error);
      set.status = 500;
      return { success: false, message: 'Gagal memperbarui data' };
    }
  })
  // Delete materi
  .delete('/api/materi/:id', async ({ params: { id }, set }) => {
    try {
      // Get dokumen IDs
      const [dokumenRows] = await pool.query(
        'SELECT id FROM dokumen_materi WHERE materi_id = ?',
        [id]
      );
      
      // Delete keywords
      for (const dokumen of (dokumenRows as any[])) {
        await pool.execute(
          'DELETE FROM dokumen_materi_keyword WHERE dokumen_materi_id = ?',
          [dokumen.id]
        );
      }
      
      // Delete dokumen
      await pool.execute('DELETE FROM dokumen_materi WHERE materi_id = ?', [id]);
      
      // Delete materi
      await pool.execute('DELETE FROM materi WHERE id = ?', [id]);
      
      return { success: true, message: 'Materi berhasil dihapus' };
    } catch (error) {
      console.error('Error deleting materi:', error);
      set.status = 500;
      return { success: false, message: 'Gagal menghapus data' };
    }
  })
  .listen(5000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);