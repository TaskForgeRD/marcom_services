import { pool } from "../config/database";

export async function getAllFitur() {
  const [rows] = await pool.query("SELECT * FROM fitur");
  return rows;
}

export async function getFiturByName(name: string) {
  const [rows] = await pool.query("SELECT id FROM fitur WHERE name = ?", [
    name,
  ]);
  return (rows as any[])[0];
}
