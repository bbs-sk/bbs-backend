import { pool } from "../config/db.js";

// GET DATA SURAT JALAN
export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_surat_jalan
       WHERE status = 1
       ORDER BY id_surat_jalan DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data surat jalan",
      detail: err.message,
    });
  }
}

// TAMBAH DATA SURAT JALAN
export async function add(req, res) {
  const { id_invoice, no_surat_jalan, plat_kendaraan } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_surat_jalan
        (
          id_invoice,
          no_surat_jalan,
          plat_kendaraan
        )
       VALUES ($1, $2, $3)
       RETURNING id_surat_jalan`,
      [id_invoice, no_surat_jalan, plat_kendaraan],
    );

    return res.status(201).json({
      message: "Surat jalan berhasil ditambahkan",
      id: result.rows[0].id_surat_jalan,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah surat jalan",
      detail: err.message,
    });
  }
}

// UPDATE DATA SURAT JALAN
export async function update(req, res) {
  const { id_surat_jalan, id_invoice, no_surat_jalan, plat_kendaraan } =
    req.body;

  try {
    const result = await pool.query(
      `UPDATE tbl_surat_jalan
       SET
          id_invoice = $1,
          no_surat_jalan = $2,
          plat_kendaraan = $3
       WHERE id_surat_jalan = $4`,
      [id_invoice, no_surat_jalan, plat_kendaraan, id_surat_jalan],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data surat jalan tidak ditemukan",
      });
    }

    return res.json({
      message: "Surat jalan berhasil diupdate",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update surat jalan",
      detail: err.message,
    });
  }
}

// HAPUS / NONAKTIFKAN SURAT JALAN
export async function remove(req, res) {
  const { id_surat_jalan } = req.body;

  const idNum = Number(id_surat_jalan);

  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({
      message: "Parameter id tidak valid",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_surat_jalan
       SET status = 0
       WHERE id_surat_jalan = $1
       AND status = 1`,
      [idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data surat jalan tidak ditemukan atau sudah dinonaktifkan",
      });
    }

    return res.json({
      message: "Surat jalan berhasil dinonaktifkan",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal menonaktifkan surat jalan",
      detail: err.message,
    });
  }
}
