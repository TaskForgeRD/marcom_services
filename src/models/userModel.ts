// models/userModel.ts
import { pool } from '../config/database';

export interface User {
  id?: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE google_id = ?',
    [googleId]
  );
  
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  
  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const [result] = await pool.execute(
    `INSERT INTO users (google_id, email, name, avatar_url) 
     VALUES (?, ?, ?, ?)`,
    [userData.google_id, userData.email, userData.name, userData.avatar_url || null]
  );
  
  return (result as any).insertId;
}

export async function updateUser(id: number, userData: Partial<User>): Promise<void> {
  const fields = [];
  const values = [];
  
  if (userData.name) {
    fields.push('name = ?');
    values.push(userData.name);
  }
  
  if (userData.avatar_url) {
    fields.push('avatar_url = ?');
    values.push(userData.avatar_url);
  }
  
  if (fields.length > 0) {
    values.push(id);
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
}