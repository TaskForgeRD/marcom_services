import * as materiModel from '../models/materiModel';
import * as brandService from './brandService';
import * as clusterService from './clusterService';
import { saveFile } from '../utils/fileUpload';
import { Materi, MateriResponse, DokumenMateriWithKeywords } from '../types';

export async function getAllMateri(): Promise<MateriResponse[]> {
  const materiList = await materiModel.getAllMateri();
  
  return await Promise.all((materiList as any[]).map(async (materi) => {
    const dokumenList = await getDokumenMateriWithKeywords(materi.id);
    
    return {
      _id: materi.id.toString(),
      brand: materi.brand_name,
      cluster: materi.cluster_name,
      fitur: materi.fitur,
      namaMateri: materi.nama_materi,
      jenis: materi.jenis,
      startDate: materi.start_date,
      endDate: materi.end_date,
      periode: materi.periode,
      dokumenMateri: dokumenList
    };
  }));
}

export async function getMateriById(id: number) {
  const materi = await materiModel.getMateriById(id);
  
  if (!materi) {
    return null;
  }
  
  const dokumenList = await getDokumenMateriWithKeywords(id);
  
  return {
    ...materi,
    dokumenMateri: dokumenList
  };
}

export async function getDokumenMateriWithKeywords(materiId: number): Promise<DokumenMateriWithKeywords[]> {
  const dokumenList = await materiModel.getDokumenMateriByMateriId(materiId);
  
  return await Promise.all(dokumenList.map(async (dokumen) => {
    const keywords = await materiModel.getKeywordsByDokumenId(dokumen.id);
    
    return {
      id: dokumen.id,
      linkDokumen: dokumen.link_dokumen,
      tipeMateri: dokumen.tipe_materi,
      thumbnail: dokumen.thumbnail,
      keywords
    };
  }));
}

export async function createMateri(formData: FormData) {
  // Extract materi data
  const brand = formData.get('brand') as string;
  const cluster = formData.get('cluster') as string;
  const fitur = formData.get('fitur') as string;
  const namaMateri = formData.get('namaMateri') as string;
  const jenis = formData.get('jenis') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const periode = formData.get('periode') as string;
  
  // Get brand and cluster IDs
  const brandId = await brandService.getBrandIdByName(brand);
  const clusterId = await clusterService.getClusterIdByName(cluster);
  
  if (!brandId || !clusterId) {
    throw new Error('Brand atau Cluster tidak valid');
  }
  
  // Create materi record
  const materiData: Materi = {
    brand_id: brandId,
    cluster_id: clusterId,
    fitur,
    nama_materi: namaMateri,
    jenis,
    start_date: startDate,
    end_date: endDate,
    periode
  };
  
  const materiId = await materiModel.createMateri(materiData);
  
  // Process dokumen materi
  await processDokumenMateri(formData, materiId);
  
  // Get the created materi
  const createdMateri = await materiModel.getMateriById(materiId);
  
  return { 
    success: true,
    _id: materiId,
    ...createdMateri
  };
}

export async function updateMateri(id: number, formData: FormData) {
  // Extract materi data
  const brand = formData.get('brand') as string;
  const cluster = formData.get('cluster') as string;
  const fitur = formData.get('fitur') as string;
  const namaMateri = formData.get('namaMateri') as string;
  const jenis = formData.get('jenis') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const periode = formData.get('periode') as string;
  
  // Get brand and cluster IDs
  const brandId = await brandService.getBrandIdByName(brand);
  const clusterId = await clusterService.getClusterIdByName(cluster);
  
  if (!brandId || !clusterId) {
    throw new Error('Brand atau Cluster tidak valid');
  }
  
  // Update materi record
  const materiData: Materi = {
    brand_id: brandId,
    cluster_id: clusterId,
    fitur,
    nama_materi: namaMateri,
    jenis,
    start_date: startDate,
    end_date: endDate,
    periode
  };
  
  await materiModel.updateMateri(id, materiData);
  
  // Delete existing dokumen and keywords
  const existingDokumen = await materiModel.getDokumenMateriByMateriId(id);
  
  for (const dokumen of existingDokumen) {
    await materiModel.deleteDokumenKeywords(dokumen.id);
  }
  
  await materiModel.deleteDokumenByMateriId(id);
  
  // Process new dokumen materi
  await processDokumenMateri(formData, id);
  
  // Get the updated materi
  const updatedMateri = await materiModel.getMateriById(id);
  
  return { 
    success: true,
    _id: id,
    ...updatedMateri
  };
}

async function processDokumenMateri(formData: FormData, materiId: number) {
  const dokumenCount = parseInt(formData.get('dokumenMateriCount') as string) || 0;
  
  for (let i = 0; i < dokumenCount; i++) {
    const linkDokumen = formData.get(`dokumenMateri[${i}][linkDokumen]`) as string;
    const tipeMateri = formData.get(`dokumenMateri[${i}][tipeMateri]`) as string;
    const thumbnail = formData.get(`dokumenMateri[${i}][thumbnail]`);
    const keywordsRaw = formData.get(`dokumenMateri[${i}][keywords]`) as string;
    
    // Process thumbnail if present
    let thumbnailFileName = '';

    if (thumbnail instanceof File && thumbnail.size > 0) {
      // Jika ada file baru yang diunggah
      thumbnailFileName = await saveFile(thumbnail);
    } else if (typeof thumbnail === 'string' && thumbnail) {
      // Jika ada nama file yang dikirim (gambar lama)
      thumbnailFileName = thumbnail;
    }
    
    // Create dokumen record
    const dokumenId = await materiModel.createDokumenMateri({
      materi_id: materiId,
      link_dokumen: linkDokumen,
      tipe_materi: tipeMateri,
      thumbnail: thumbnailFileName
    });
    
    // Process keywords
    const keywords = JSON.parse(keywordsRaw || '[]');
    for (const keyword of keywords) {
      if (keyword) {
        await materiModel.createKeyword(dokumenId, keyword);
      }
    }
  }
}

export async function deleteMateri(id: number) {
  // Get dokumen IDs
  const dokumenList = await materiModel.getDokumenMateriByMateriId(id);
  
  // Delete keywords
  for (const dokumen of dokumenList) {
    await materiModel.deleteDokumenKeywords(dokumen.id);
  }
  
  // Delete dokumen
  await materiModel.deleteDokumenByMateriId(id);
  
  // Delete materi
  await materiModel.deleteMateri(id);
  
  return { success: true, message: 'Materi berhasil dihapus' };
}