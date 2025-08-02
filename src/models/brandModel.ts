import { pool } from "../config/database";

export async function getAllBrands() {
  const [rows] = await pool.query("SELECT * FROM brand ORDER BY name");
  return rows;
}

export async function getBrandById(id: number) {
  const [rows] = await pool.query("SELECT * FROM brand WHERE id = ?", [id]);
  return (rows as any[])[0];
}

export async function getBrandByName(name: string) {
  const [rows] = await pool.query("SELECT * FROM brand WHERE name = ?", [name]);
  return (rows as any[])[0];
}

export async function createBrand(name: string) {
  // Check if brand already exists
  const existing = await getBrandByName(name);
  if (existing) {
    throw new Error("Brand dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute("INSERT INTO brand (name) VALUES (?)", [
    name,
  ]);
  const insertId = (result as any).insertId;

  return await getBrandById(insertId);
}

export async function updateBrand(id: number, name: string) {
  // Check if another brand with the same name exists
  const existing = await getBrandByName(name);
  if (existing && existing.id !== id) {
    throw new Error("Brand dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute(
    "UPDATE brand SET name = ? WHERE id = ?",
    [name, id]
  );
  return (result as any).affectedRows > 0;
}

export async function deleteBrand(id: number) {
  const [result] = await pool.execute("DELETE FROM brand WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}
