import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM tbl_stock
       ORDER BY id_stock DESC`,
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data stock",
      detail: err.message,
    });
  }
}

export async function add(req, res) {
  const { id_barang, jumlah, status, harga, id_invoice, datetime } = req.body;

  const idBarangNum = Number(id_barang);
  if (!Number.isInteger(idBarangNum) || idBarangNum <= 0) {
    return res.status(400).json({ message: "id_barang harus integer > 0" });
  }

  const jumlahNum = Number(jumlah);
  if (!Number.isFinite(jumlahNum) || jumlahNum <= 0) {
    return res.status(400).json({ message: "jumlah harus angka > 0" });
  }

  const allowedStatus = ["masuk", "keluar"];
  const statusVal = String(status || "")
    .trim()
    .toLowerCase();

  if (!allowedStatus.includes(statusVal)) {
    return res.status(400).json({
      message: `status harus salah satu: ${allowedStatus.join(", ")}`,
    });
  }

  const hargaNum = Number(harga);
  if (!Number.isFinite(hargaNum) || hargaNum < 0) {
    return res.status(400).json({ message: "harga harus angka >= 0" });
  }

  const idInvoiceNum =
    id_invoice === undefined || id_invoice === null || id_invoice === ""
      ? null
      : Number(id_invoice);

  if (
    idInvoiceNum !== null &&
    (!Number.isInteger(idInvoiceNum) || idInvoiceNum <= 0)
  ) {
    return res
      .status(400)
      .json({ message: "id_invoice harus integer > 0 atau null" });
  }

  const datetimeVal =
    datetime === undefined ||
    datetime === null ||
    String(datetime).trim() === ""
      ? null
      : String(datetime).trim();

  try {
    const [result] = await pool.query(
      `INSERT INTO tbl_stock (id_barang, jumlah, status, harga, id_invoice, datetime)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
      [idBarangNum, jumlahNum, statusVal, hargaNum, idInvoiceNum, datetimeVal],
    );

    return res.status(201).json({
      message: "Stock berhasil ditambahkan",
      id: result.insertId,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal tambah stock",
      detail: err.message,
    });
  }
}

export async function update(req, res) {
  const { id_stock, id_barang, jumlah, status, harga, id_invoice, datetime } =
    req.body;

  const idStockNum = Number(id_stock);
  if (!Number.isInteger(idStockNum) || idStockNum <= 0) {
    return res.status(400).json({ message: "id_stock harus integer > 0" });
  }

  const idBarangNum = Number(id_barang);
  if (!Number.isInteger(idBarangNum) || idBarangNum <= 0) {
    return res.status(400).json({ message: "id_barang harus integer > 0" });
  }

  const jumlahNum = Number(jumlah);
  if (!Number.isFinite(jumlahNum) || jumlahNum <= 0) {
    return res.status(400).json({ message: "jumlah harus angka > 0" });
  }

  const allowedStatus = ["masuk", "keluar"];
  const statusVal = String(status || "")
    .trim()
    .toLowerCase();
  if (!allowedStatus.includes(statusVal)) {
    return res.status(400).json({
      message: `status harus salah satu: ${allowedStatus.join(", ")}`,
    });
  }

  const hargaNum = Number(harga);
  if (!Number.isFinite(hargaNum) || hargaNum < 0) {
    return res.status(400).json({ message: "harga harus angka >= 0" });
  }

  const idInvoiceNum =
    id_invoice === undefined || id_invoice === null || id_invoice === ""
      ? null
      : Number(id_invoice);

  if (
    idInvoiceNum !== null &&
    (!Number.isInteger(idInvoiceNum) || idInvoiceNum <= 0)
  ) {
    return res
      .status(400)
      .json({ message: "id_invoice harus integer > 0 atau null" });
  }

  const datetimeVal =
    datetime === undefined ||
    datetime === null ||
    String(datetime).trim() === ""
      ? null
      : String(datetime).trim();

  try {
    const [result] = await pool.query(
      `UPDATE tbl_stock
       SET id_barang = ?, jumlah = ?, status = ?, harga = ?, id_invoice = ?, datetime = COALESCE(?, datetime)
       WHERE id_stock = ?`,
      [
        idBarangNum,
        jumlahNum,
        statusVal,
        hargaNum,
        idInvoiceNum,
        datetimeVal,
        idStockNum,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock tidak ditemukan" });
    }

    return res.json({ message: "Stock berhasil diupdate" });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update stock",
      detail: err.message,
    });
  }
}

export async function remove(req, res) {
  const { id_stock } = req.body;

  const idStockNum = Number(id_stock);
  if (!Number.isInteger(idStockNum) || idStockNum <= 0) {
    return res.status(400).json({ message: "id_stock harus integer > 0" });
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM tbl_stock WHERE id_stock = ?`,
      [idStockNum],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Stock tidak ditemukan" });
    }

    return res.json({ message: "Stock berhasil dihapus (hard delete)" });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal hapus stock",
      detail: err.message,
    });
  }
}
