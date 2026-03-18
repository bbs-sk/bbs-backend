import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM tbl_invoice 
       WHERE deleted_at IS NULL 
       ORDER BY id_invoice DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data invoice",
      detail: err.message,
    });
  }
}

export async function add(req, res) {
  const { id_user, id_proyek, total_harga, status } = req.body;

  const idUserNum = Number(id_user);
  const idProyekNum = Number(id_proyek);
  const totalHargaNum = Number(total_harga);

  if (!Number.isInteger(idUserNum) || idUserNum <= 0) {
    return res.status(400).json({ message: "id_user harus integer > 0" });
  }
  if (!Number.isInteger(idProyekNum) || idProyekNum <= 0) {
    return res.status(400).json({ message: "id_proyek harus integer > 0" });
  }
  if (!Number.isFinite(totalHargaNum) || totalHargaNum < 0) {
    return res.status(400).json({ message: "total_harga harus angka >= 0" });
  }

  const statusVal =
    typeof status === "string" && status.trim() !== ""
      ? status.trim()
      : "dipesan";

  try {
    const result = await pool.query(
      `INSERT INTO tbl_invoice (id_user, id_proyek, total_harga, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id_invoice`,
      [idUserNum, idProyekNum, totalHargaNum, statusVal],
    );

    return res.status(201).json({
      message: "Invoice berhasil ditambahkan",
      id: result.rows[0].id_invoice,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah invoice",
      detail: err.message,
    });
  }
}

export async function update(req, res) {
  const {
    id_invoice,
    id_user,
    id_proyek,
    total_harga,
    status,
    aproved_at,
    deliver_at,
  } = req.body;

  const idInvoiceNum = Number(id_invoice);
  if (!Number.isInteger(idInvoiceNum) || idInvoiceNum <= 0) {
    return res.status(400).json({ message: "id_invoice harus integer > 0" });
  }

  const idUserNum = Number(id_user);
  const idProyekNum = Number(id_proyek);
  const totalHargaNum = Number(total_harga);

  if (!Number.isInteger(idUserNum) || idUserNum <= 0) {
    return res.status(400).json({ message: "id_user harus integer > 0" });
  }
  if (!Number.isInteger(idProyekNum) || idProyekNum <= 0) {
    return res.status(400).json({ message: "id_proyek harus integer > 0" });
  }
  if (!Number.isFinite(totalHargaNum) || totalHargaNum < 0) {
    return res.status(400).json({ message: "total_harga harus angka >= 0" });
  }

  const allowedStatus = ["dipesan", "dikirim", "selesai"];
  const statusVal = String(status || "")
    .trim()
    .toLowerCase();

  if (!allowedStatus.includes(statusVal)) {
    return res.status(400).json({
      message: `status harus salah satu: ${allowedStatus.join(", ")}`,
    });
  }

  const aprovedAtVal = aproved_at ?? null;
  const deliverAtVal = deliver_at ?? null;

  try {
    const result = await pool.query(
      `UPDATE tbl_invoice
       SET id_user = $1,
           id_proyek = $2,
           total_harga = $3,
           status = $4,
           aproved_at = $5,
           deliver_at = $6
       WHERE id_invoice = $7 AND deleted_at IS NULL`,
      [
        idUserNum,
        idProyekNum,
        totalHargaNum,
        statusVal,
        aprovedAtVal,
        deliverAtVal,
        idInvoiceNum,
      ],
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Invoice tidak ditemukan / sudah dihapus" });
    }

    return res.json({ message: "Invoice berhasil diupdate" });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update invoice",
      detail: err.message,
    });
  }
}

export async function remove(req, res) {
  const { id_invoice } = req.body;
  const idInvoiceNum = Number(id_invoice);

  if (!Number.isInteger(idInvoiceNum) || idInvoiceNum <= 0) {
    return res.status(400).json({ message: "id_invoice harus integer > 0" });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_invoice 
       SET deleted_at = NOW() 
       WHERE id_invoice = $1 AND deleted_at IS NULL`,
      [idInvoiceNum],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Invoice tidak ditemukan atau sudah dihapus",
      });
    }

    return res.json({
      message: "Invoice berhasil dihapus (soft delete)",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal soft delete invoice",
      detail: err.message,
    });
  }
}
