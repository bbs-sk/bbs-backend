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
          bk.jumlah,
          bk.harga_jual,
          bk.datetime,
          bk.status
       FROM tbl_brg_keluar bk
       JOIN tbl_barang b 
            ON bk.id_barang = b.id_barang
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
          bk.harga_jual,
          bk.datetime,
          bk.status
       FROM tbl_brg_keluar bk
       JOIN tbl_barang b 
            ON bk.id_barang = b.id_barang
       WHERE bk.status = 1 and bk.id_invoice = $1
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

// TAMBAH BARANG KELUAR
export async function add(req, res) {
  const { id_barang, id_invoice, jumlah, harga_jual } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_brg_keluar 
        (id_barang, id_invoice, jumlah, harga_jual) 
       VALUES ($1, $2, $3, $4)
       RETURNING id_brg_keluar`,
      [id_barang, id_invoice, jumlah, harga_jual],
    );

    return res.status(201).json({
      message: "Barang keluar berhasil ditambahkan",
      id: result.rows[0].id_brg_keluar,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah barang keluar",
      detail: err.message,
    });
  }
}

// UPDATE BARANG KELUAR
export async function update(req, res) {
  const { id_brg_keluar, id_barang, id_invoice, jumlah, harga_jual } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tbl_brg_keluar
       SET 
          id_barang = $1,
          id_invoice = $2,
          jumlah = $3,
          harga_jual = $4
       WHERE id_brg_keluar = $5`,
      [id_barang, id_invoice, jumlah, harga_jual, id_brg_keluar],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data barang keluar tidak ditemukan",
      });
    }

    return res.json({
      message: "Barang keluar berhasil diupdate",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update barang keluar",
      detail: err.message,
    });
  }
}

// HAPUS / NONAKTIFKAN BARANG KELUAR
export async function remove(req, res) {
  const { id_brg_keluar } = req.body;

  const idNum = Number(id_brg_keluar);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({
      message: "Parameter id tidak valid",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_brg_keluar
       SET status = 0
       WHERE id_brg_keluar = $1
       AND status = 1`,
      [idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data barang keluar tidak ditemukan atau sudah dinonaktifkan",
      });
    }

    return res.json({
      message: "Barang keluar berhasil dinonaktifkan",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal menonaktifkan barang keluar",
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
          MIN(bk.datetime AT TIME ZONE 'Asia/Jakarta'),
          'YYYY-MM-DD'
        ) AS date,

        SUM(
          CAST(bk.jumlah AS INTEGER)
        ) AS total_items,

        COUNT(DISTINCT bk.id_barang) AS total_produk,

        SUM(
          CAST(bk.jumlah AS NUMERIC)
          *
          CAST(bk.harga_jual AS NUMERIC)
        ) AS total_price,

        SUM(
          CAST(bk.profit AS NUMERIC)
        ) AS total_profit,

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
