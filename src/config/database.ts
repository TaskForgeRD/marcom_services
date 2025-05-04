import * as mysql from 'mysql2/promise';

export const createDatabasePool = () => {
  return mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};

export const pool = createDatabasePool();