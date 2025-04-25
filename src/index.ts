import { Elysia } from "elysia";
import mysql from "mysql2/promise";

const {
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_HOST = "db",
} = process.env;

const app = new Elysia();

const pool = mysql.createPool({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
});

app.get("/users", async () => {
  const [rows] = await pool.query("SELECT * FROM users");
  return rows;
});

app.listen(3000);
console.log("🦊 Elysia running at http://localhost:3000");
