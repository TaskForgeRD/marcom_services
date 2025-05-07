import mysql from 'mysql2/promise';

export class Database {
  private static instance: Database;
  private pool!: mysql.Pool;

  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root_password',
      database: process.env.MYSQL_DATABASE || 'marcom_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    Database.instance = this;
    console.log('Database connection pool created');
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T> {
    try {
      const [results] = await this.pool.query(sql, params);
      return results as T;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection pool closed');
    }
  }

  getPool(): mysql.Pool {
    return this.pool;
  }
}