import { pool } from "../config/db.js";

// GET DATA BARANG KELUAR
export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
          bk.id_brg_keluar,
          bk.id_barang,
          b.nama_barang,
          b.kode_barang,

          bk.id_invoice,

          i.id_project,
          p.nama_project,

          bk.jumlah,
          bk.harga_jual,
          TO_CHAR(
            bk.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
          bk.status

       FROM tbl_brg_keluar bk

       LEFT JOIN tbl_barang b 
            ON bk.id_barang = b.id_barang

       LEFT JOIN tbl_invoice i
            ON bk.id_invoice = i.id_invoice

       LEFT JOIN tbl_project p
            ON i.id_project = p.id_project

       WHERE bk.status = 1

       ORDER BY bk.id_brg_keluar DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data barang keluar",
      detail: err.message,
    });
  }
}

export async function getIdInvoice(req, res) {
  try {
    const { id_invoice } = req.body;
    const result = await pool.query(
      `SELECT 
          bk.id_brg_keluar,
          bk.id_barang,
          b.nama_barang,
          b.kode_barang,
          b.satuan,
          bk.id_invoice,
          bk.jumlah,
          bk.profit,
          bk.harga_jual,
          TO_CHAR(
            bk.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
          bk.status
       FROM tbl_brg_keluar bk
       JOIN tbl_barang b 
            ON bk.id_barang = b.id_barang
       WHERE bk.id_invoice = $1
       ORDER BY bk.id_brg_keluar DESC`,
      [id_invoice],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data barang keluar",
      detail: err.message,
    });
  }
}

export async function getMonthly(req, res) {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(CAST(jumlah AS INTEGER)), 0) AS total
      FROM tbl_brg_keluar
      WHERE 
        DATE_PART('month', datetime::date) = DATE_PART('month', CURRENT_DATE)
        AND
        DATE_PART('year', datetime::date) = DATE_PART('year', CURRENT_DATE)
        AND
        status = 1
    `);

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil barang keluar",
      detail: err.message,
    });
  }
}

export async function getLaporanPenjualan(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        bk.id_invoice,

        p.nama_project,

        TO_CHAR(
          MIN(bk.datetime),
          'YYYY-MM-DD HH24:MI:SS'
        ) AS date,

        SUM(CAST(bk.jumlah AS INTEGER)) AS total_items,

        COUNT(DISTINCT bk.id_barang) AS total_produk,

        SUM(
          CAST(bk.jumlah AS NUMERIC) * CAST(bk.harga_jual AS NUMERIC)
        ) AS total_price,

        -- Keuntungan kotor dari penjualan
        SUM(
          CAST(bk.jumlah AS NUMERIC) * CAST(bk.profit AS NUMERIC)
        ) AS total_profit_kotor,

        -- Kerugian dari retur (hpp × jumlah_retur per invoice)
        COALESCE((
          SELECT SUM(CAST(r.hpp AS NUMERIC) * CAST(r.jumlah AS NUMERIC))
          FROM tbl_retur r
          WHERE r.id_invoice = bk.id_invoice
            AND r.status = 1
        ), 0) AS total_kerugian_retur,

        -- Keuntungan bersih
        SUM(
          CAST(bk.jumlah AS NUMERIC) * CAST(bk.profit AS NUMERIC)
        ) - COALESCE((
          SELECT SUM(CAST(r.hpp AS NUMERIC) * CAST(r.jumlah AS NUMERIC))
          FROM tbl_retur r
          WHERE r.id_invoice = bk.id_invoice
            AND r.status = 1
        ), 0) AS total_profit,

        i.pembayaran AS status_pembayaran

      FROM tbl_brg_keluar bk

      JOIN tbl_invoice i
        ON bk.id_invoice = i.id_invoice

      JOIN tbl_project p
        ON i.id_project = p.id_project

      WHERE
        bk.status = 1
        AND LOWER(i.pembayaran) = 'lunas'

      GROUP BY
        bk.id_invoice,
        p.nama_project,
        i.pembayaran

      ORDER BY
        MIN(bk.datetime) DESC
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mengambil laporan penjualan",
      detail: err.message,
    });
  }
}

// SEARCH BARANG KELUAR
export async function search(req, res) {
  const { keyword } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT 
          bk.id_brg_keluar,
          bk.id_barang,
          b.nama_barang,
          b.kode_barang,
          bk.id_invoice,
          bk.jumlah,
          bk.harga_jual,
          bk.datetime,
          bk.status
       FROM tbl_brg_keluar bk

       JOIN tbl_barang b 
            ON bk.id_barang = b.id_barang

       WHERE 
            bk.status = 1
            AND b.nama_barang ILIKE $1

       ORDER BY bk.id_brg_keluar DESC
      `,
      [`%${keyword}%`],
    );

    return res.json({
      message: "Berhasil mencari data barang keluar",
      val: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mencari data barang keluar",
      detail: err.message,
    });
  }
}
