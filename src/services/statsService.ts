import { pool } from "../config/database";
import { RowDataPacket } from "mysql2";

export interface UserStats {
  userId: number;
  total: number;
  fitur: number;
  komunikasi: number;
  aktif: number;
  expired: number;
  dokumen: number;
  lastUpdated: Date;
}

interface MateriStatsRow extends RowDataPacket {
  total: number;
  fitur: number;
  komunikasi: number;
  aktif: number;
  expired: number;
}

interface DokumenStatsRow extends RowDataPacket {
  dokumen: number;
}

export async function getUserStats(userId: number): Promise<UserStats> {
  try {
    const [materiRows] = await pool.execute<MateriStatsRow[]>(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN fitur IS NOT NULL AND fitur != '' THEN 1 ELSE 0 END) as fitur,
        SUM(CASE WHEN nama_materi IS NOT NULL AND nama_materi != '' THEN 1 ELSE 0 END) as komunikasi,
        SUM(CASE WHEN end_date > NOW() THEN 1 ELSE 0 END) as aktif,
        SUM(CASE WHEN end_date <= NOW() THEN 1 ELSE 0 END) as expired
      FROM materi 
      WHERE user_id = ?
    `,
      [userId]
    );

    const [dokumenRows] = await pool.execute<DokumenStatsRow[]>(
      `
      SELECT COUNT(DISTINCT m.id) as dokumen
      FROM materi m
      INNER JOIN dokumen_materi dm ON m.id = dm.materi_id
      WHERE m.user_id = ?
    `,
      [userId]
    );

    const materiStats = materiRows[0];
    const dokumenStats = dokumenRows[0];

    return {
      userId,
      total: materiStats.total || 0,
      fitur: materiStats.fitur || 0,
      komunikasi: materiStats.komunikasi || 0,
      aktif: materiStats.aktif || 0,
      expired: materiStats.expired || 0,
      dokumen: dokumenStats.dokumen || 0,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw error;
  }
}
