export type Materi = {
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
    namaMateri: string;
    jenis: string;
    startDate: string;
    endDate: string;
    periode: string;
    dokumenMateri: DokumenMateriWithKeywords[];
};

export type DokumenMateriWithKeywords = {
    linkDokumen: string;
    thumbnail: string;
    tipeMateri: string;
    keywords: string[];
};
