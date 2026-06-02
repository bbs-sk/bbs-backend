import { pool } from "../config/db.js";

export async function getActivity(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
          b.nama_barang,
          TO_CHAR(
            bm.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
          bm.jumlah,
          bm.harga_beli AS harga,
          b.satuan,
          'Barang Masuk' AS aktivitas
      FROM tbl_brg_masuk bm
      JOIN tbl_barang b 
          ON bm.id_barang = b.id_barang
      WHERE bm.status = 1

      UNION ALL

      SELECT 
          b.nama_barang,
          TO_CHAR(
            bk.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
          bk.jumlah,
          bk.harga_jual AS harga,
          b.satuan,
          'Barang Keluar' AS aktivitas
      FROM tbl_brg_keluar bk
      JOIN tbl_barang b 
          ON bk.id_barang = b.id_barang
      WHERE bk.status = 1

      UNION ALL

      SELECT 
          b.nama_barang,
          TO_CHAR(
            r.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
          r.jumlah,
          r.harga_jual AS harga,
          b.satuan,
          'Retur' AS aktivitas
      FROM tbl_retur r
      JOIN tbl_barang b 
          ON r.id_barang = b.id_barang

      ORDER BY datetime DESC
      LIMIT 15
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data activity",
      detail: err.message,
    });
  }
}
