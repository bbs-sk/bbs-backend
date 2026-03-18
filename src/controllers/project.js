import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_project
       WHERE status = 1
       ORDER BY id_project DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data project",
      detail: err.message,
    });
  }
}

export async function add(req, res) {
  const { nama_project, alamat } = req.body;

  const namaVal = typeof nama_project === "string" ? nama_project.trim() : "";
  if (!namaVal) {
    return res.status(400).json({ message: "nama_project wajib diisi" });
  }

  const alamatVal = typeof alamat === "string" ? alamat.trim() : "";

  try {
    const result = await pool.query(
      `INSERT INTO tbl_project (nama_project, alamat, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id_project`,
      [namaVal, alamatVal],
    );

    return res.status(201).json({
      message: "Project berhasil ditambahkan",
      id: result.rows[0].id_project,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah project",
      detail: err.message,
    });
  }
}

export async function update(req, res) {
  const { id_project, nama_project, alamat, status } = req.body;

  const idNum = Number(id_project);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: "id_project harus integer > 0" });
  }

  const namaVal = typeof nama_project === "string" ? nama_project.trim() : "";
  if (!namaVal) {
    return res.status(400).json({ message: "nama_project wajib diisi" });
  }

  const alamatVal = typeof alamat === "string" ? alamat.trim() : "";

  let statusNum = status === undefined || status === null ? 1 : Number(status);
  if (![0, 1].includes(statusNum)) {
    return res.status(400).json({ message: "status harus 0 atau 1" });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_project
       SET nama_project = $1,
           alamat = $2,
           status = $3,
           updated_at = NOW()
       WHERE id_project = $4`,
      [namaVal, alamatVal, statusNum, idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project tidak ditemukan" });
    }

    return res.json({ message: "Project berhasil diupdate" });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update project",
      detail: err.message,
    });
  }
}

export async function remove(req, res) {
  const { id_project } = req.body;

  const idNum = Number(id_project);
  if (!Number.isInteger(idNum) || idNum <= 0) {
    return res.status(400).json({ message: "id_project harus integer > 0" });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_project
       SET status = 0,
           updated_at = NOW()
       WHERE id_project = $1 AND status = 1`,
      [idNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Project tidak ditemukan atau sudah terhapus",
      });
    }

    return res.json({ message: "Project berhasil dihapus (soft delete)" });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal soft delete project",
      detail: err.message,
    });
  }
}
