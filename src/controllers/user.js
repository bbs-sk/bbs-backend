import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM tbl_user ORDER BY id_user DESC",
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
  const { name, role, username, password, email } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tbl_user (name, role, username, password, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_user`,
      [name, role, username, password, email],
    );

    return res.status(201).json({
      message: "User berhasil ditambahkan",
      id: result.rows[0].id_user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah data",
      detail: err.message,
    });
  }
}

export async function update(req, res) {
  const { id_user, name, role, username, password, email } = req.body;

  if (!id_user) {
    return res.status(400).json({
      message: "id_user wajib diisi",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_user
       SET name = $1,
           role = $2,
           username = $3,
           password = $4,
           email = $5
       WHERE id_user = $6`,
      [name, role, username, password, email, id_user],
    );

    return res.json({
      message: "User berhasil diupdate",
      affectedRows: result.rowCount,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update data",
      detail: err.message,
    });
  }
}

export async function remove(req, res) {
  const { id_user } = req.body;

  if (!id_user) {
    return res.status(400).json({
      message: "id_user wajib diisi",
    });
  }

  try {
    const result = await pool.query("DELETE FROM tbl_user WHERE id_user = $1", [
      id_user,
    ]);

    return res.json({
      message: "User berhasil dihapus",
      affectedRows: result.rowCount,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal hapus data",
      detail: err.message,
    });
  }
}
