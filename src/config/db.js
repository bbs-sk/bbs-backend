import dotenv from "dotenv";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;
const connectionString = process.env.DATABASE_URL;
export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
});

export async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query("SELECT 1");
    console.log("✅ Database connected:", res.rows);
  } catch (error) {
    console.error("❌ Connection error:", error.message);
  } finally {
    if (client) client.release();
  }
}

export async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error("❌ Query error:", error.message);
    throw error;
  }
}

export async function closePool() {
  await pool.end();
  console.log("🔌 Database pool closed");
}
