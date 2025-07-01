import { pool } from '../config/database';

export async function getAllJenis() {
  const [rows] = await pool.query('SELECT * FROM jenis');
  return rows;
}

export async function getJenisByName(name: string) {
  const [rows] = await pool.query('SELECT id FROM jenis WHERE name = ?', [name]);
  return (rows as any[])[0];
}