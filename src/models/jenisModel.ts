import { pool } from "../config/database";

export async function getAllJenis() {
  const [rows] = await pool.query("SELECT * FROM jenis ORDER BY name");
  return rows;
}

export async function getJenisById(id: number) {
  const [rows] = await pool.query("SELECT * FROM jenis WHERE id = ?", [id]);
  return (rows as any[])[0];
}

export async function getJenisByName(name: string) {
  const [rows] = await pool.query("SELECT * FROM jenis WHERE name = ?", [name]);
  return (rows as any[])[0];
}

export async function createJenis(name: string) {
  // Check if jenis already exists
  const existing = await getJenisByName(name);
  if (existing) {
    throw new Error("Jenis dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute("INSERT INTO jenis (name) VALUES (?)", [
    name,
  ]);
  const insertId = (result as any).insertId;

  return await getJenisById(insertId);
}

export async function updateJenis(id: number, name: string) {
  // Check if another jenis with the same name exists
  const existing = await getJenisByName(name);
  if (existing && existing.id !== id) {
    throw new Error("Jenis dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute(
    "UPDATE jenis SET name = ? WHERE id = ?",
    [name, id]
  );
  return (result as any).affectedRows > 0;
}

export async function deleteJenis(id: number) {
  const [result] = await pool.execute("DELETE FROM jenis WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}
