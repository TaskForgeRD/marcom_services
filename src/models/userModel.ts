import { pool } from "../config/database";

export const roles = ["superadmin", "admin", "guest"] as const;
export type Role = (typeof roles)[number];

export interface User {
  id?: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  role?: Role;
}

export async function findUserByGoogleId(
  googleId: string
): Promise<User | null> {
  const [rows] = await pool.query("SELECT * FROM users WHERE google_id = ?", [
    googleId,
  ]);

  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function getUserById(id: number): Promise<User | null> {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);

  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
    email,
  ]);

  const users = rows as User[];
  return users.length > 0 ? users[0] : null;
}

export async function createUser(
  userData: Omit<User, "id" | "created_at" | "updated_at">
): Promise<number> {
  try {
    const [result] = await pool.execute(
      `INSERT INTO users (google_id, email, name, avatar_url, role) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        userData.google_id || null,
        userData.email,
        userData.name,
        userData.avatar_url || null,
        userData.role || "guest",
      ]
    );

    return (result as any).insertId;
  } catch (error) {
    throw error;
  }
}

export async function updateUser(
  id: number,
  userData: Partial<User>
): Promise<User | null> {
  try {
    const fields = [];
    const values = [];

    if (userData.google_id !== undefined) {
      fields.push("google_id = ?");
      values.push(userData.google_id);
    }

    if (userData.email) {
      fields.push("email = ?");
      values.push(userData.email);
    }

    if (userData.name) {
      fields.push("name = ?");
      values.push(userData.name);
    }

    if (userData.avatar_url !== undefined) {
      fields.push("avatar_url = ?");
      values.push(userData.avatar_url);
    }

    if (userData.role !== undefined) {
      fields.push("role = ?");
      values.push(userData.role);
    }

    if (fields.length > 0) {
      fields.push("updated_at = NOW()");
      values.push(id);

      await pool.execute(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    return await getUserById(id);
  } catch (error) {
    throw error;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const [rows] = await pool.query(
      "SELECT id, google_id, email, name, avatar_url, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    );

    return rows as User[];
  } catch (error) {
    throw error;
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    const [result] = await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    if ((result as any).affectedRows === 0) {
      throw new Error("User not found or already deleted");
    }
  } catch (error) {
    throw error;
  }
}
