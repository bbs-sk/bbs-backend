import { pool } from "../config/db.js";

// GET DATA RETUR
export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
          r.id_retur,
          r.id_barang,
          b.nama_barang,
          b.kode_barang,
          r.id_invoice,
          r.jumlah,
          r.harga_jual,
          r.kondisi,
          r.datetime,
          r.status
       FROM tbl_retur r
       JOIN tbl_barang b
            ON r.id_barang = b.id_barang
       WHERE r.status = 1
       ORDER BY r.id_retur DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data retur",
      detail: err.message,
    });
  }
}

// TAMBAH DATA RETUR
export async function add(req, res) {
  const { id_barang, id_invoice, jumlah, harga_jual, kondisi } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_retur
        (
          id_barang,
          id_invoice,
          jumlah,
          harga_jual,
          kondisi
        )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_retur`,
      [id_barang, id_invoice, jumlah, harga_jual, kondisi],
    );

    return res.status(201).json({
      message: "Data retur berhasil ditambahkan",
      id: result.rows[0].id_retur,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah data retur",
      detail: err.message,
    });
  }
}

// UPDATE DATA RETUR
export async function update(req, res) {
  const { id_retur, id_barang, id_invoice, jumlah, harga_jual, kondisi } =
    req.body;

  try {
    const result = await pool.query(
      `UPDATE tbl_retur
       SET
          id_barang = $1,
          id_invoice = $2,
          jumlah = $3,
          harga_jual = $4,
          kondisi = $5
       WHERE id_retur = $6`,
      [id_barang, id_invoice, jumlah, harga_jual, kondisi, id_retur],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data retur tidak ditemukan",
      });
    }

    return res.json({
      message: "Data retur berhasil diupdate",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update data retur",
      detail: err.message,
    });
  }
}

// HAPUS / NONAKTIFKAN DATA RETUR
export async function remove(req, res) {
  const { id_retur } = req.body;

  const idNum = Number(id_retur);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({
      message: "Parameter id tidak valid",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_retur
       SET status = 0
       WHERE id_retur = $1
       AND status = 1`,
      [idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data retur tidak ditemukan atau sudah dinonaktifkan",
      });
    }

    return res.json({
      message: "Data retur berhasil dinonaktifkan",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal menonaktifkan data retur",
      detail: err.message,
    });
  }
}

// SEARCH DATA RETUR
export async function search(req, res) {
  const { keyword } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT 
          r.id_retur,
          r.id_barang,
          b.nama_barang,
          b.kode_barang,
          r.id_invoice,
          r.jumlah,
          r.harga_jual,
          r.kondisi,
          r.datetime,
          r.status

      FROM tbl_retur r

      JOIN tbl_barang b
          ON r.id_barang = b.id_barang

      WHERE
          r.status = 1
          AND (
            b.nama_barang ILIKE $1
          )

      ORDER BY r.id_retur DESC
      `,
      [`%${keyword}%`],
    );

    return res.json({
      message: "Berhasil mencari data retur",
      val: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mencari data retur",
      detail: err.message,
    });
  }
}
