import * as mysql from 'mysql2/promise';

export const createDatabasePool = () => {
  return mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'marcom',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
};

export const pool = createDatabasePool();