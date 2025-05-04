import { Elysia } from 'elysia';
import { MateriRepository, MateriComplete } from '../repositories/materiRepository';
import { BrandRepository } from '../repositories/brandRepository';
import { ClusterRepository } from '../repositories/clusterRepository';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const materiRepository = new MateriRepository();

// Ensure uploads directory exists
const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdir(uploadDir, { recursive: true }).catch(error => {
    console.error('Failed to create uploads directory:', error);
  });
}

const materiRoutes = new Elysia({ prefix: '/api/materi' })
  // Get all materi
  .get('/', async () => {
    try {
      const materials = await materiRepository.findAll();
      return { success: true, data: materials };
    } catch (error) {
      console.error('Error fetching materials:', error);
      return { success: false, message: 'Failed to fetch materials', error: (error as Error).message };
    }
  })

  // Get materi by ID
  .get('/:id', async ({ params }) => {
    try {
      const id = parseInt(params.id);
      const materi = await materiRepository.findById(id);
      
      if (!materi) {
        return { success: false, message: `Materi with ID ${id} not found` };
      }
      
      return { success: true, data: materi };
    } catch (error) {
      console.error(`Error fetching materi with ID ${params.id}:`, error);
      return { success: false, message: 'Failed to fetch materi', error: (error as Error).message };
    }
  })

  // Create materi
  .post('/', async ({ body }) => {
    try {
      // Handle file upload if there are any
      const materiData = body as any;
      
      // Determine brand and cluster IDs
      let brand_id = 0;
      let cluster_id = 0;
      
      // Handle case where frontend sends the name instead of ID
      if (typeof materiData.brand === 'string') {
        const brandRepo = new BrandRepository();
        const brands = await brandRepo.findAll();
        const brand = brands.find(b => b.name === materiData.brand);
        if (brand) {
          brand_id = brand.id as number;
        } else {
          // Create new brand if it doesn't exist
          const newBrand = await brandRepo.create({ name: materiData.brand });
          brand_id = newBrand.id as number;
        }
      } else {
        brand_id = materiData.brand_id || 0;
      }
      
      // Handle cluster the same way
      if (typeof materiData.cluster === 'string') {
        const clusterRepo = new ClusterRepository();
        const clusters = await clusterRepo.findAll();
        const cluster = clusters.find(c => c.name === materiData.cluster);
        if (cluster) {
          cluster_id = cluster.id as number;
        } else {
          // Create new cluster if it doesn't exist
          const newCluster = await clusterRepo.create({ name: materiData.cluster });
          cluster_id = newCluster.id as number;
        }
      } else {
        cluster_id = materiData.cluster_id || 0;
      }
      
      const processedData: MateriComplete = {
        brand_id: brand_id,
        cluster_id: cluster_id,
        fitur: materiData.fitur || '',
        nama_materi: materiData.namaMateri || materiData.nama_materi || '',
        jenis: materiData.jenis || '',
        start_date: materiData.startDate || materiData.start_date || new Date().toISOString().split('T')[0],
        end_date: materiData.endDate || materiData.end_date || new Date().toISOString().split('T')[0],
        periode: materiData.periode?.toString() || '',
        dokumenMateri: []
      };

      // Process dokumen materi if any
      if (materiData.dokumenMateri && Array.isArray(materiData.dokumenMateri)) {
        for (const dokumen of materiData.dokumenMateri) {
          let thumbnailFileName = '';
          
          // Save thumbnail file if it exists
          if (dokumen.thumbnail) {
            try {
              if (typeof dokumen.thumbnail === 'string') {
                // Already a filename or URL
                thumbnailFileName = dokumen.thumbnail;
              } else if (dokumen.thumbnail.name) {
                thumbnailFileName = `${Date.now()}-${dokumen.thumbnail.name}`;
                const filePath = join(uploadDir, thumbnailFileName);
                
                // Handle different formats of file data
                if (dokumen.thumbnail.data) {
                  // Convert Base64 to buffer and save
                  const fileData = Buffer.from(dokumen.thumbnail.data, 'base64');
                  await writeFile(filePath, fileData);
                } else if (dokumen.thumbnail.buffer) {
                  await writeFile(filePath, dokumen.thumbnail.buffer);
                }
              }
            } catch (fileError) {
              console.error('Error saving thumbnail:', fileError);
            }
          }

          // Add document to processedData
          processedData.dokumenMateri.push({
            link_dokumen: dokumen.linkDokumen || '',
            tipe_materi: dokumen.tipeMateri || '',
            thumbnail: thumbnailFileName,
            keywords: dokumen.keywords || []
          });
        }
      }

      const newMateri = await materiRepository.create(processedData);
      return { success: true, data: newMateri, message: 'Materi created successfully' };
    } catch (error) {
      console.error('Error creating materi:', error);
      return { success: false, message: 'Failed to create materi', error: (error as Error).message };
    }
  })
export default materiRoutes;