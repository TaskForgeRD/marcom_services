import { pool } from "../config/database";

export async function getAllClusters() {
  const [rows] = await pool.query("SELECT * FROM cluster ORDER BY name");
  return rows;
}

export async function getClusterById(id: number) {
  const [rows] = await pool.query("SELECT * FROM cluster WHERE id = ?", [id]);
  return (rows as any[])[0];
}

export async function getClusterByName(name: string) {
  const [rows] = await pool.query("SELECT * FROM cluster WHERE name = ?", [
    name,
  ]);
  return (rows as any[])[0];
}

export async function createCluster(name: string) {
  // Check if cluster already exists
  const existing = await getClusterByName(name);
  if (existing) {
    throw new Error("Cluster dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute("INSERT INTO cluster (name) VALUES (?)", [
    name,
  ]);
  const insertId = (result as any).insertId;

  return await getClusterById(insertId);
}

export async function updateCluster(id: number, name: string) {
  // Check if another cluster with the same name exists
  const existing = await getClusterByName(name);
  if (existing && existing.id !== id) {
    throw new Error("Cluster dengan nama tersebut sudah ada");
  }

  const [result] = await pool.execute(
    "UPDATE cluster SET name = ? WHERE id = ?",
    [name, id]
  );
  return (result as any).affectedRows > 0;
}

export async function deleteCluster(id: number) {
  const [result] = await pool.execute("DELETE FROM cluster WHERE id = ?", [id]);
  return (result as any).affectedRows > 0;
}
