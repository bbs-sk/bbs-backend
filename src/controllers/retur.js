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

          i.id_project,
          p.nama_project,

          r.jumlah,
          r.harga_jual,
          r.kondisi,
          TO_CHAR(
            r.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
          r.status

       FROM tbl_retur r

       JOIN tbl_barang b
            ON r.id_barang = b.id_barang

       JOIN tbl_invoice i
            ON r.id_invoice = i.id_invoice

       JOIN tbl_project p
            ON i.id_project = p.id_project

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

export async function add(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id_barang, id_invoice, jumlah, harga_jual, hpp, kondisi } =
      req.body;

    const barangResult = await client.query(
      `
      SELECT nama_barang, jumlah
      FROM tbl_barang
      WHERE id_barang = $1
      `,
      [id_barang],
    );

    if (barangResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const namaBarang = barangResult.rows[0].nama_barang;
    const stok = Number(barangResult.rows[0].jumlah);
    const qtyRetur = Number(jumlah);

    if (qtyRetur > stok) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Stok ${namaBarang} tidak mencukupi. Tersedia ${stok}, diminta ${qtyRetur}.`,
      });
    }

    const result = await client.query(
      `
      INSERT INTO tbl_retur
      (
        id_barang,
        id_invoice,
        jumlah,
        harga_jual,
        hpp,
        kondisi
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_retur
      `,
      [id_barang, id_invoice, jumlah, harga_jual, hpp, kondisi],
    );

    await client.query(
      `
      UPDATE tbl_barang
      SET jumlah = jumlah - $1
      WHERE id_barang = $2
      `,
      [jumlah, id_barang],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Data retur berhasil ditambahkan",
      id: result.rows[0].id_retur,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal tambah data retur",
      detail: err.message,
    });
  } finally {
    client.release();
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
          TO_CHAR(
            r.datetime,
            'YYYY-MM-DD HH24:MI:SS'
          ) AS datetime,
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

// GET RETUR BERDASARKAN INVOICE
export async function getReturByInvoice(req, res) {
  try {
    const { id_invoice } = req.params;

    const result = await pool.query(
      `
      SELECT
        r.id_retur,
        r.id_invoice,
        r.id_barang,
        r.jumlah,
        r.harga_jual,
        r.hpp,
        r.kondisi,
        TO_CHAR(
          r.datetime,
          'YYYY-MM-DD HH24:MI:SS'
        ) AS datetime,

        b.nama_barang,
        b.satuan

      FROM tbl_retur r

      JOIN tbl_barang b
      ON b.id_barang = r.id_barang

      WHERE r.id_invoice = $1

      ORDER BY r.id_retur DESC
      `,
      [id_invoice],
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
}
