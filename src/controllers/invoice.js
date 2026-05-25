import { pool } from "../config/db.js";

export async function get(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        i.id_invoice,
        i.id_user,
        u.name AS name,

        i.id_project,
        p.nama_project,

        i.total_harga,
        i.status,
        i.pembayaran,
        i.detail,
        i.created_at,
        i.aproved_at,
        i.deliver_at

      FROM tbl_invoice i

      LEFT JOIN tbl_user u
        ON i.id_user = u.id_user

      LEFT JOIN tbl_project p
        ON i.id_project = p.id_project

      WHERE i.deleted_at IS NULL

      ORDER BY i.id_invoice DESC
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data invoice",
      detail: err.message,
    });
  }
}

export async function getRole(req, res) {
  try {
    const { role, id_user } = req.body;

    let query = `
      SELECT
        i.id_invoice,
        i.id_user,
        u.name AS name,

        i.id_project,
        p.nama_project,

        i.total_harga,
        i.status,
        i.pembayaran,
        i.detail,
        i.created_at,
        i.aproved_at,
        i.deliver_at

      FROM tbl_invoice i

      LEFT JOIN tbl_user u
        ON i.id_user = u.id_user

      LEFT JOIN tbl_project p
        ON i.id_project = p.id_project

      WHERE i.deleted_at IS NULL
    `;

    const values = [];

    if (role === "Admin Kantor") {
      // tidak ada filter tambahan
    } else if (role === "Lapangan") {
      query += ` AND i.id_user = $1`;
      values.push(id_user);
    } else if (role === "Gudang") {
      query += `
        AND i.status NOT IN ('pending', 'rejected')
      `;
    }

    query += ` ORDER BY i.id_invoice DESC`;

    const result = await pool.query(query, values);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data invoice",
      detail: err.message,
    });
  }
}

export async function recent(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        i.id_invoice,
        i.id_user,
        u.name AS name,

        i.id_project,
        p.nama_project,

        i.total_harga,
        i.status,
        i.pembayaran,
        i.detail,
        i.created_at,
        i.aproved_at,
        i.deliver_at

      FROM tbl_invoice i

      LEFT JOIN tbl_user u
        ON i.id_user = u.id_user

      LEFT JOIN tbl_project p
        ON i.id_project = p.id_project

      WHERE i.deleted_at IS NULL

      ORDER BY i.id_invoice DESC

      LIMIT 10
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data invoice",
      detail: err.message,
    });
  }
}

export async function add(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      id_user,
      id_project,
      total_harga,
      status,
      pembayaran,
      detail,
      barang,
    } = req.body;

    // VALIDASI
    if (!Number.isInteger(Number(id_project)) || Number(id_project) <= 0) {
      return res.status(400).json({
        message: "id_project harus integer > 0",
      });
    }

    // INSERT INVOICE
    const invoiceResult = await client.query(
      `INSERT INTO tbl_invoice
      (
        id_user,
        id_project,
        total_harga,
        status,
        pembayaran,
        detail
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_invoice`,
      [id_user, id_project, total_harga, status, pembayaran, detail],
    );

    const id_invoice = invoiceResult.rows[0].id_invoice;

    // INSERT BARANG KELUAR
    for (const item of barang) {
      await client.query(
        `INSERT INTO tbl_brg_keluar
        (
          id_barang,
          id_invoice,
          jumlah,
          harga_jual
        )
        VALUES ($1, $2, $3, $4)`,
        [item.id_barang, id_invoice, item.jumlah, item.harga_jual],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Invoice berhasil ditambahkan",
      id_invoice,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal tambah invoice",
      detail: err.message,
    });
  } finally {
    client.release();
  }
}

export async function update(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id_invoice, id_project, total_harga, pembayaran, detail, barang } =
      req.body;

    // UPDATE INVOICE
    await client.query(
      `
      UPDATE tbl_invoice
      SET
        id_project = $1,
        total_harga = $2,
        pembayaran = $3,
        detail = $4
      WHERE id_invoice = $5
      `,
      [id_project, total_harga, pembayaran, detail, id_invoice],
    );

    // HAPUS DETAIL LAMA
    await client.query(
      `
      DELETE FROM tbl_brg_keluar
      WHERE id_invoice = $1
      `,
      [id_invoice],
    );

    // INSERT DETAIL BARU
    for (const item of barang) {
      await client.query(
        `
        INSERT INTO tbl_brg_keluar
        (
          id_barang,
          id_invoice,
          jumlah,
          harga_jual
        )
        VALUES ($1, $2, $3, $4)
        `,
        [item.id_barang, id_invoice, item.jumlah, item.harga_jual],
      );
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Invoice berhasil diupdate",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal update invoice",
      detail: err.message,
    });
  } finally {
    client.release();
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

export async function status(req, res) {
  try {
    const { id_invoice, status } = req.body;

    await pool.query(
      `
      UPDATE tbl_invoice
      SET status = $1
      WHERE id_invoice = $2
    `,
      [status, id_invoice],
    );

    return res.json({
      message: "Status berhasil diupdate",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update status",
      detail: err.message,
    });
  }
}

export async function monthly(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS bulan,
        SUM(total_harga) AS total
      FROM tbl_invoice
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '4 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)
    `);

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mengambil data penjualan",
      detail: err.message,
    });
  }
}

export async function wait(req, res) {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total
      FROM tbl_invoice
      WHERE status = 'menunggu'
    `);

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data pesanan",
      detail: err.message,
    });
  }
}
