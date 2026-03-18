import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT * 
       FROM tbl_barang 
       WHERE status = '1' 
       ORDER BY id_barang DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data",
      detail: err.message,
    });
  }
}

export async function add(req, res) {
  const { nama_barang, satuan, harga } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_barang (nama_barang, satuan, harga) 
       VALUES ($1, $2, $3)
       RETURNING id_barang`,
      [nama_barang, satuan, harga],
    );

    return res.status(201).json({
      message: "Item berhasil ditambahkan",
      id: result.rows[0].id_barang,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah data",
      detail: err.message,
    });
  }
}

export async function update(req, res) {
  const { id_barang, nama_barang, satuan, harga } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tbl_barang 
       SET nama_barang = $1, satuan = $2, harga = $3 
       WHERE id_barang = $4`,
      [nama_barang, satuan, harga, id_barang],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data barang tidak ditemukan",
      });
    }

    return res.json({ message: "Item berhasil diupdate" });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update data",
      detail: err.message,
    });
  }
}

export async function remove(req, res) {
  const { id_barang } = req.body;

  const idNum = Number(id_barang);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: "Parameter id tidak valid" });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_barang 
       SET status = 0 
       WHERE id_barang = $1 AND status = 1`,
      [idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Data barang tidak ditemukan atau sudah dinonaktifkan",
      });
    }

    return res.json({
      message: "Item berhasil dinonaktifkan (status = 0)",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal menonaktifkan data",
      detail: err.message,
    });
  }
}
