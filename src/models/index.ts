// Brand model
export interface Brand {
    id?: number;
    name: string;
  }
  
  // Cluster model
  export interface Cluster {
    id?: number;
    name: string;
  }
  
  // Materi model
  export interface Materi {
    id?: number;
    brand_id: number;
    cluster_id: number;
    fitur: string;
    nama_materi: string;
    jenis: string;
    start_date: string; // YYYY-MM-DD format
    end_date: string;   // YYYY-MM-DD format
    periode: string;
    brand?: Brand;      // For join operations
    cluster?: Cluster;  // For join operations
    dokumenMateri?: DokumenMateri[]; // Related documents
  }
  
  // Dokumen Materi model
  export interface DokumenMateri {
    id?: number;
    materi_id: number;
    link_dokumen: string;
    tipe_materi: string;
    thumbnail: string; // Path to thumbnail image
    keywords?: string[]; // Related keywords
  }
  
  // Dokumen Materi Keyword model
  export interface DokumenMateriKeyword {
    id?: number;
    dokumen_materi_id: number;
    keyword: string;
  }
  
  // Request body for creating materi with nested documents
  export interface CreateMateriRequest {
    brand: string;
    cluster: string;
    fitur: string;
    namaMateri: string;
    jenis: string;
    startDate: string;
    endDate: string;
    periode: string;
    dokumenMateri: {
      linkDokumen: string;
      tipeMateri: string;
      thumbnail: File;
      keywords: string[];
    }[];
  }

export type DokumenMateriWithKeywords = DokumenMateri & {
  keywords: string[];
};

export type MateriWithDokumen = Materi & {
  dokumenMateri: DokumenMateriWithKeywords[];
};