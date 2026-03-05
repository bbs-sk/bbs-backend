import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM tbl_barang WHERE status = '1' ORDER BY id_barang DESC",
    );
    return res.json(rows);
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Gagal ambil data", detail: err.message });
  }
}

export async function add(req, res) {
  const { nama_barang, satuan, harga } = req.body;

  try {
    const [result] = await pool.query(
      "INSERT INTO tbl_barang (nama_barang, satuan, harga) VALUES (?, ?, ?)",
      [nama_barang, satuan, harga],
    );
    return res
      .status(201)
      .json({ message: "Item berhasil ditambahkan", id: result.insertId });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Gagal tambah data", detail: err.message });
  }
}

// UPDATE: PUT /api/barang/:id
export async function update(req, res) {
  const { id_barang, nama_barang, satuan, harga } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE tbl_barang SET nama_barang = ?, satuan = ?, harga = ? WHERE id_barang = ?",
      [nama_barang, satuan, harga, id_barang],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Data barang tidak ditemukan" });
    }

    return res.json({ message: "Item berhasil diupdate" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Gagal update data", detail: err.message });
  }
}

// DELETE: DELETE /api/barang/:id
// SOFT DELETE: DELETE /api/barang/:id  => set status = 0
export async function remove(req, res) {
  const { id_barang } = req.body;

  if (!Number.isInteger(id_barang) || id_barang <= 0) {
    return res.status(400).json({ message: "Parameter id tidak valid" });
  }

  try {
    // Opsional: biar idempotent, hanya update yang status=1
    const [result] = await pool.query(
      "UPDATE tbl_barang SET status = 0 WHERE id_barang = ? AND status = 1",
      [id_barang],
    );

    if (result.affectedRows === 0) {
      // Bisa berarti id tidak ada ATAU sudah status=0
      return res.status(404).json({
        message: "Data barang tidak ditemukan atau sudah dinonaktifkan",
      });
    }

    return res.json({ message: "Item berhasil dinonaktifkan (status = 0)" });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Gagal menonaktifkan data", detail: err.message });
  }
}
