import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "root",
  database: "db_bbs",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

export async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT 1");
    console.log("✅ Database connected");
  } finally {
    conn.release();
  }
}
