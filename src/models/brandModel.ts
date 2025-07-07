import { pool } from "../config/database";

export async function getAllBrands() {
  const [rows] = await pool.query("SELECT * FROM brand");
  return rows;
}

export async function getBrandByName(name: string) {
  const [rows] = await pool.query("SELECT id FROM brand WHERE name = ?", [
    name,
  ]);
  return (rows as any[])[0];
}
