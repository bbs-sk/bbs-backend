import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        b.*,
        TO_CHAR(b.datetime, 'YYYY-MM-DD HH24:MI:SS') AS datetime,

        EXISTS (
          SELECT 1
          FROM tbl_brg_keluar bk
          WHERE bk.id_barang = b.id_barang
        ) AS has_barang_keluar

      FROM tbl_barang b

      WHERE b.status = '1'

      ORDER BY b.id_barang DESC`,
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
  const { nama_barang, satuan, kode_barang, harga_jual } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_barang (nama_barang, satuan, kode_barang, harga_jual) 
       VALUES ($1, $2, $3, $4)
       RETURNING id_barang`,
      [nama_barang, satuan, kode_barang, harga_jual],
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
  const { id_barang, kode_barang, nama_barang, satuan, harga_jual } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tbl_barang 
       SET nama_barang = $1, satuan = $2, harga_jual = $3, kode_barang = $4 
       WHERE id_barang = $5`,
      [nama_barang, satuan, harga_jual, kode_barang, id_barang],
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

export async function search(req, res) {
  const { keyword } = req.body;

  try {
    const result = await pool.query(
      `
      SELECT *
      FROM tbl_barang
      WHERE
        status = '1'
        AND (
          nama_barang ILIKE $1
          OR kode_barang ILIKE $1
          OR satuan ILIKE $1
        )
      ORDER BY id_barang DESC
      `,
      [`%${keyword}%`],
    );

    return res.json({
      message: "Berhasil mencari data",
      val: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal Mencari Data",
      detail: err.message,
    });
  }
}

export async function getTotal(req, res) {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(jumlah), 0) AS total
      FROM tbl_barang
      WHERE status = '1'
    `);

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil total barang",
      detail: err.message,
    });
  }
}
