export type Materi = {
  id?: number;
  user_id: number;
  brand_id: number;
  cluster_id: number;
  fitur_id?: number;
  jenis_id?: number;
  nama_materi: string;
  start_date: string;
  end_date: string;
  periode: string;
  created_at?: string;
  updated_at?: string;
};

export type DokumenMateri = {
  id?: number;
  materi_id: number;
  link_dokumen: string;
  tipe_materi: string;
  thumbnail: string;
};

export type DokumenMateriKeyword = {
  id?: number;
  dokumen_materi_id: number;
  keyword: string;
};

export type MateriResponse = {
  _id: string;
  brand: string;
  cluster: string;
  fitur: string;
  nama_materi: string;
  jenis: string;
  start_date: string;
  end_date: string;
  periode: string;
  dokumenMateri: DokumenMateriWithKeywords[];
};

export type DokumenMateriWithKeywords = {
  linkDokumen: string;
  thumbnail: string;
  tipeMateri: string;
  keywords: string[];
};

export type User = {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
};

export interface PaginationFilters {
  search?: string;
  status?: string;
  brand?: string;
  cluster?: string;
  fitur?: string;
  jenis?: string;
  start_date?: string;
  end_date?: string;
  only_visual_docs?: boolean;
}

export interface PaginatedResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompleteStatsResult {
  fitur: number;
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
  dokumen: number;
  lastUpdated: string;
}

export interface MonthlyStatsResult {
  total: Array<{ month: string; value: number }>;
  fitur: Array<{ month: string; value: number }>;
  komunikasi: Array<{ month: string; value: number }>;
  aktif: Array<{ month: string; value: number }>;
  expired: Array<{ month: string; value: number }>;
  dokumen: Array<{ month: string; value: number }>;
}

export interface MateriStatsResult {
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
}
