import { pool } from "../config/database";

export async function getAllFitur() {
  const [rows] = await pool.query("SELECT * FROM fitur ORDER BY name");
  return rows;
}

export async function getFiturById(id: number) {
  const [rows] = await pool.query("SELECT * FROM fitur WHERE id = ?", [id]);
  return (rows as any[])[0];
}

export async function getFiturByName(name: string) {
  const [rows] = await pool.query("SELECT * FROM fitur WHERE name = ?", [name]);
  return (rows as any[])[0];
}

export async function createFitur(name: string) {
  // Check if fitur already exists
  const existing = await getFiturByName(name);
  if (existing) {
    throw new Error("Fitur dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute("INSERT INTO fitur (name) VALUES (?)", [
    name,
  ]);
  const insertId = (result as any).insertId;

  return await getFiturById(insertId);
}

export async function updateFitur(id: number, name: string) {
  // Check if another fitur with the same name exists
  const existing = await getFiturByName(name);
  if (existing && existing.id !== id) {
    throw new Error("Fitur dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute(
    "UPDATE fitur SET name = ? WHERE id = ?",
    [name, id]
  );
  return (result as any).affectedRows > 0;
}

export async function deleteFitur(id: number) {
  const [result] = await pool.execute("DELETE FROM fitur WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}
