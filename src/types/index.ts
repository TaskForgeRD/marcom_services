// types.ts
export type Materi = {
  id?: number;
  user_id: number;
  brand_id: number;
  cluster_id: number;
  fitur_id?: number; // Changed from fitur: string
  jenis_id?: number; // Changed from jenis: string
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

export type User = {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
};
