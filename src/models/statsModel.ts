import { pool } from "../config/database";

interface PaginationFilters {
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

interface CompleteStatsResult {
  fitur: number;
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
  dokumen: number;
  lastUpdated: string;
}

interface MonthlyStatsResult {
  total: Array<{ month: string; value: number }>;
  fitur: Array<{ month: string; value: number }>;
  komunikasi: Array<{ month: string; value: number }>;
  aktif: Array<{ month: string; value: number }>;
  expired: Array<{ month: string; value: number }>;
  dokumen: Array<{ month: string; value: number }>;
}

function buildWhereClause(
  filters: PaginationFilters,
  excludeExpired: boolean = false
): {
  whereClause: string;
  queryParams: any[];
} {
  const whereConditions: string[] = [];
  const queryParams: any[] = [];

  if (excludeExpired && !filters.status) {
    whereConditions.push(`m.end_date > CURDATE()`);
  }

  if (filters.search?.trim()) {
    whereConditions.push(`(
      m.nama_materi LIKE ? OR 
      EXISTS (
        SELECT 1 FROM dokumen_materi dm2 
        JOIN dokumen_materi_keyword dmk2 ON dm2.id = dmk2.dokumen_materi_id 
        WHERE dm2.materi_id = m.id AND dmk2.keyword LIKE ?
      )
    )`);
    const searchTerm = `%${filters.search.trim()}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  if (filters.status && !filters.status.toLowerCase().includes("semua")) {
    if (filters.status.toLowerCase() === "aktif") {
      whereConditions.push(`m.end_date > CURDATE()`);
    } else if (filters.status.toLowerCase() === "expired") {
      whereConditions.push(`m.end_date <= CURDATE()`);
    }
  }

  if (filters.brand && !filters.brand.toLowerCase().includes("semua")) {
    whereConditions.push(`b.name = ?`);
    queryParams.push(filters.brand);
  }

  if (filters.cluster && !filters.cluster.toLowerCase().includes("semua")) {
    whereConditions.push(`c.name = ?`);
    queryParams.push(filters.cluster);
  }

  if (filters.fitur && !filters.fitur.toLowerCase().includes("semua")) {
    whereConditions.push(`f.name = ?`);
    queryParams.push(filters.fitur);
  }

  if (filters.jenis && !filters.jenis.toLowerCase().includes("semua")) {
    whereConditions.push(`j.name = ?`);
    queryParams.push(filters.jenis);
  }

  if (filters.start_date) {
    whereConditions.push(`m.end_date >= ?`);
    queryParams.push(new Date(filters.start_date).toISOString().split("T")[0]);
  }

  if (filters.end_date) {
    whereConditions.push(`m.start_date <= ?`);
    queryParams.push(new Date(filters.end_date).toISOString().split("T")[0]);
  }

  if (filters.only_visual_docs) {
    whereConditions.push(`EXISTS (
      SELECT 1 FROM dokumen_materi dm_visual 
      WHERE dm_visual.materi_id = m.id AND dm_visual.tipe_materi = 'Key Visual'
    )`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
  return { whereClause, queryParams };
}

export async function getDetailedMonthlyStats(
  filters: PaginationFilters
): Promise<MonthlyStatsResult> {
  const { whereClause, queryParams } = buildWhereClause(filters, false);

  const query = `
    SELECT 
      MONTH(m.start_date) as month_num,
      MONTHNAME(m.start_date) as month_name,
      COUNT(DISTINCT m.id) as total,
      COUNT(DISTINCT CASE WHEN f.id IS NOT NULL THEN m.id END) as fitur,
      COUNT(DISTINCT CASE WHEN m.nama_materi IS NOT NULL AND m.nama_materi != '' THEN m.id END) as komunikasi,
      COUNT(DISTINCT CASE WHEN m.end_date > CURDATE() THEN m.id END) as aktif,
      COUNT(DISTINCT CASE WHEN m.end_date <= CURDATE() THEN m.id END) as expired,
      COUNT(DISTINCT CASE WHEN dm.id IS NOT NULL THEN m.id END) as dokumen
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    AND YEAR(m.start_date) = YEAR(CURDATE())
    GROUP BY MONTH(m.start_date), MONTHNAME(m.start_date)
    ORDER BY MONTH(m.start_date)
  `;

  const [rows] = await pool.query(query, queryParams);
  const results = rows as any[];

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const categories = [
    "total",
    "fitur",
    "komunikasi",
    "aktif",
    "expired",
    "dokumen",
  ] as const;

  const monthlyStats = {} as any;

  categories.forEach((category) => {
    monthlyStats[category] = monthNames.map((monthName, index) => {
      const found = results.find((row) => row.month_num === index + 1);
      return {
        month: monthName,
        value: found ? found[category] : 0,
      };
    });
  });

  return monthlyStats;
}

export async function getFiturCount(
  filters: PaginationFilters
): Promise<number> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(DISTINCT f.id) as fitur_count
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    AND f.id IS NOT NULL
  `;

  const [result] = await pool.query(query, queryParams);
  return (result as any[])[0].fitur_count || 0;
}

export async function getMateriStats(filters: PaginationFilters): Promise<{
  komunikasi: number;
  aktif: number;
  expired: number;
  total: number;
}> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT 
      COUNT(DISTINCT m.id) as total,
      COUNT(DISTINCT CASE WHEN m.nama_materi IS NOT NULL AND m.nama_materi != '' THEN m.id END) as komunikasi,
      COUNT(DISTINCT CASE WHEN m.end_date > CURDATE() THEN m.id END) as aktif,
      COUNT(DISTINCT CASE WHEN m.end_date <= CURDATE() THEN m.id END) as expired
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
  `;

  const [result] = await pool.query(query, queryParams);
  const row = (result as any[])[0];

  return {
    komunikasi: row.komunikasi || 0,
    aktif: row.aktif || 0,
    expired: row.expired || 0,
    total: row.total || 0,
  };
}

export async function getDokumenCount(
  filters: PaginationFilters
): Promise<number> {
  const { whereClause, queryParams } = buildWhereClause(filters);

  const query = `
    SELECT COUNT(DISTINCT dm.id) as dokumen_count
    FROM materi m
    JOIN brand b ON m.brand_id = b.id
    JOIN cluster c ON m.cluster_id = c.id
    LEFT JOIN fitur f ON m.fitur_id = f.id
    LEFT JOIN jenis j ON m.jenis_id = j.id
    LEFT JOIN dokumen_materi dm ON m.id = dm.materi_id
    LEFT JOIN dokumen_materi_keyword dmk ON dm.id = dmk.dokumen_materi_id
    ${whereClause}
    AND dm.id IS NOT NULL
  `;

  const [result] = await pool.query(query, queryParams);
  return (result as any[])[0].dokumen_count || 0;
}

export async function getCompleteStats(
  filters: PaginationFilters
): Promise<CompleteStatsResult> {
  const [fiturCount, materiStats, dokumenCount] = await Promise.all([
    getFiturCount(filters),
    getMateriStats(filters),
    getDokumenCount(filters),
  ]);

  return {
    fitur: fiturCount,
    komunikasi: materiStats.komunikasi,
    aktif: materiStats.aktif,
    expired: materiStats.expired,
    total: materiStats.total,
    dokumen: dokumenCount,
    lastUpdated: new Date().toISOString(),
  };
}
