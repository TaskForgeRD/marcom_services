import { pool } from "../config/database";

export async function getAllClusters() {
  const [rows] = await pool.query("SELECT * FROM cluster");
  return rows;
}

export async function getClusterByName(name: string) {
  const [rows] = await pool.query("SELECT id FROM cluster WHERE name = ?", [
    name,
  ]);
  return (rows as any[])[0];
}
