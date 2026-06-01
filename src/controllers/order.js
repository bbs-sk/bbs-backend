import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        i.id_invoice,
        i.id_user,
        i.id_proyek,
        i.total_harga,
        i.status,
        i.pembayaran,
        i.created_at,

        COUNT(s.id_stock) AS total_item,

        COALESCE(
          json_agg(
            json_build_object(
              'id_stock', s.id_stock,
              'id_barang', s.id_barang,
              'nama_barang', b.nama_barang,
              'satuan', b.satuan,
              'jumlah', s.jumlah,
              'harga', s.harga,
              'status', s.status
            )
          ) FILTER (WHERE s.id_stock IS NOT NULL),
          '[]'
        )::json  AS items

      FROM tbl_invoice i
      LEFT JOIN tbl_stock s ON s.id_invoice = i.id_invoice
      LEFT JOIN tbl_barang b ON b.id_barang = s.id_barang

      WHERE i.deleted_at IS NULL

      GROUP BY i.id_invoice
      ORDER BY i.id_invoice DESC
    `);
    return res.json(result.rows);
  } catch (err) {


    return res.status(500).json({
      message: "Gagal ambil data order",
      error: err.message,
    });
  }
}

/* ===========================
   ADD ORDER
=========================== */
export async function add(req, res) {
  const client = await pool.connect();

  try {
    const { invoice, items } = req.body;

    // VALIDASI
    if (!invoice || !items || items.length === 0) {
      return res.status(400).json({
        message: "Data invoice atau item tidak lengkap",
      });
    }

    await client.query("BEGIN");

    // INSERT INVOICE
    const inv = await client.query(
      `INSERT INTO tbl_invoice (id_user, id_proyek, total_harga, status, pembayaran)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_invoice`,
      [
        invoice.id_user ?? null,
        invoice.id_proyek ?? null,
        invoice.total_harga ?? 0,
        "menunggu",
        invoice.pembayaran ?? "",
      ],
    );

    const id_invoice = inv.rows[0].id_invoice;

    // INSERT STOCK
    for (let item of items) {
      if (!item.id_barang) {
        throw new Error("id_barang tidak boleh kosong");
      }

      await client.query(
        `INSERT INTO tbl_stock (id_barang, jumlah, harga, status, id_invoice)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          item.id_barang,
          item.jumlah ?? 0,
          item.harga ?? 0,
          "pending",
          id_invoice,
        ],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Order berhasil dibuat",
      id_invoice,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal membuat order",
      error: err.message,
      detail: err.detail || null,
      hint: err.hint || null,
      code: err.code || null,
    });
  } finally {
    client.release();
  }
}

/* ===========================
   UPDATE ORDER
=========================== */
export async function update(req, res) {
  const client = await pool.connect();

  try {
    const { id_invoice, invoice, items } = req.body;

    if (!id_invoice) {
      return res.status(400).json({
        message: "id_invoice wajib diisi",
      });
    }

    await client.query("BEGIN");

    // UPDATE INVOICE
    await client.query(
      `UPDATE tbl_invoice
       SET id_user = $1,
           id_proyek = $2,
           total_harga = $3,
           pembayaran = $4
       WHERE id_invoice = $5`,
      [
        invoice.id_user ?? null,
        invoice.id_proyek ?? null,
        invoice.total_harga ?? 0,
        invoice.pembayaran ?? "",
        id_invoice,
      ],
    );

    // HAPUS STOCK LAMA
    await client.query(`DELETE FROM tbl_stock WHERE id_invoice = $1`, [
      id_invoice,
    ]);

    // INSERT ULANG STOCK
    for (let item of items) {
      await client.query(
        `INSERT INTO tbl_stock (id_barang, jumlah, harga, status, id_invoice)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          item.id_barang,
          item.jumlah ?? 0,
          item.harga ?? 0,
          "pending",
          id_invoice,
        ],
      );
    }

    await client.query("COMMIT");

    return res.json({
      message: "Order berhasil diupdate",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal update order",
      error: err.message,
      detail: err.detail || null,
    });
  } finally {
    client.release();
  }
}

/* ===========================
   DELETE ORDER (SOFT DELETE)
=========================== */
export async function remove(req, res) {
  const { id_invoice } = req.body;

  try {
    if (!id_invoice) {
      return res.status(400).json({
        message: "id_invoice wajib diisi",
      });
    }

    const result = await pool.query(
      `UPDATE tbl_invoice
       SET delete_at = NOW()
       WHERE id_invoice = $1`,
      [id_invoice],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Order tidak ditemukan",
      });
    }

    return res.json({
      message: "Order berhasil dihapus",
    });
  } catch (err) {

    return res.status(500).json({
      message: "Gagal hapus order",
      error: err.message,
    });
  }
}

/* ===========================
   APPROVE ORDER
=========================== */
export async function approve(req, res) {
  const { id_invoice } = req.body;

  const client = await pool.connect();

  try {
    if (!id_invoice) {
      return res.status(400).json({
        message: "id_invoice wajib diisi",
      });
    }

    await client.query("BEGIN");

    // UPDATE INVOICE
    await client.query(
      `UPDATE tbl_invoice
       SET status = 'disetujui', approved_at = NOW()
       WHERE id_invoice = $1`,
      [id_invoice],
    );

    // UPDATE STOCK → keluar
    await client.query(
      `UPDATE tbl_stock
       SET status = 'keluar'
       WHERE id_invoice = $1`,
      [id_invoice],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Order disetujui",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal approve order",
      error: err.message,
    });
  } finally {
    client.release();
  }
}
