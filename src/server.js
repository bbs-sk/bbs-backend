import app from "./app.js";
import { pool } from "./config/db.js";

const PORT = 3000;

(async () => {
  try {
    await pool.query("SELECT 1");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Server gagal start:", err.message);
    process.exit(1);
  }
})();
