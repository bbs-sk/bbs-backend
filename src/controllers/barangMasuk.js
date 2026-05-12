import { pool } from "../config/db.js";

// GET DATA BARANG MASUK
export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
          bm.id_brg_masuk,
          bm.id_barang,
          b.nama_barang,
          b.kode_barang,
          bm.jumlah,
          bm.harga_beli,
          bm.datetime,
          bm.status
       FROM tbl_brg_masuk bm
       JOIN tbl_barang b 
            ON bm.id_barang = b.id_barang
       WHERE bm.status = 1
       ORDER BY bm.id_brg_masuk DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data barang masuk",
      detail: err.message,
    });
  }
}

// TAMBAH BARANG MASUK
export async function add(req, res) {
  const { id_barang, jumlah, harga_beli } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_brg_masuk 
        (id_barang, jumlah, harga_beli) 
       VALUES ($1, $2, $3)
       RETURNING id_brg_masuk`,
      [id_barang, jumlah, harga_beli],
    );

    return res.status(201).json({
      message: "Barang masuk berhasil ditambahkan",
      id: result.rows[0].id_brg_masuk,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah barang masuk",
      detail: err.message,
    });
  }
}

// UPDATE BARANG MASUK
export async function update(req, res) {
  const { id_brg_masuk, id_barang, jumlah, harga_beli } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tbl_brg_masuk
       SET 
          id_barang = $1,
          jumlah = $2,
          harga_beli = $3
       WHERE id_brg_masuk = $4`,
      [id_barang, jumlah, harga_beli, id_brg_masuk],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data barang masuk tidak ditemukan",
      });
    }

    return res.json({
      message: "Barang masuk berhasil diupdate",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update barang masuk",
      detail: err.message,
    });
  }
}

// HAPUS / NONAKTIFKAN BARANG MASUK
export async function remove(req, res) {
  const { id_brg_masuk } = req.body;

  const idNum = Number(id_brg_masuk);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({
      message: "Parameter id tidak valid",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_brg_masuk
       SET status = 0
       WHERE id_brg_masuk = $1 
       AND status = 1`,
      [idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data barang masuk tidak ditemukan atau sudah dinonaktifkan",
      });
    }

    return res.json({
      message: "Barang masuk berhasil dinonaktifkan",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal menonaktifkan barang masuk",
      detail: err.message,
    });
  }
}
