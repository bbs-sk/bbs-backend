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
        AND i.status NOT IN ('menunggu', 'ditolak')
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

    const status_barang_keluar = status === "selesai" ? 1 : 0;
    const id_invoice = invoiceResult.rows[0].id_invoice;

    // INSERT BARANG KELUAR
    for (const item of barang) {
      // AMBIL DATA BARANG
      const barangResult = await client.query(
        `
    SELECT hpp, jumlah
    FROM tbl_barang
    WHERE id_barang = $1
    `,
        [item.id_barang],
      );

      if (barangResult.rowCount === 0) {
        throw new Error(`Barang ID ${item.id_barang} tidak ditemukan`);
      }

      const hpp = Number(barangResult.rows[0].hpp);
      const stock = Number(barangResult.rows[0].jumlah);

      // VALIDASI STOCK
      if (Number(item.jumlah) > stock) {
        throw new Error(
          `Stock barang tidak mencukupi untuk ID ${item.id_barang}`,
        );
      }

      const profit = Number(item.harga_jual) - hpp;

      // INSERT DETAIL
      await client.query(
        `
    INSERT INTO tbl_brg_keluar
    (
      id_barang,
      id_invoice,
      jumlah,
      harga_jual,
      profit,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
        [
          item.id_barang,
          id_invoice,
          item.jumlah,
          item.harga_jual,
          profit,
          status_barang_keluar,
        ],
      );

      // KURANGI STOCK
      await client.query(
        `
    UPDATE tbl_barang
    SET jumlah = jumlah - $1
    WHERE id_barang = $2
    `,
        [item.jumlah, item.id_barang],
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
      // AMBIL HPP
      const barangResult = await client.query(
        `
        SELECT hpp
        FROM tbl_barang
        WHERE id_barang = $1
        `,
        [item.id_barang],
      );

      if (barangResult.rowCount === 0) {
        throw new Error(`Barang ID ${item.id_barang} tidak ditemukan`);
      }

      const hpp = Number(barangResult.rows[0].hpp);

      const profit = Number(item.harga_jual) - hpp;

      await client.query(
        `
        INSERT INTO tbl_brg_keluar
        (
          id_barang,
          id_invoice,
          jumlah,
          harga_jual,
          profit
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [item.id_barang, id_invoice, item.jumlah, item.harga_jual, profit],
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

export async function pay(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id_invoice, pembayaran, detail } = req.body;

    // VALIDASI
    if (!id_invoice) {
      throw new Error("ID invoice wajib diisi");
    }

    // UPDATE PEMBAYARAN & DETAIL SAJA
    const result = await client.query(
      `
      UPDATE tbl_invoice
      SET
        pembayaran = $1,
        detail = $2
      WHERE id_invoice = $3
      RETURNING *
      `,
      [pembayaran, detail, id_invoice],
    );

    // CEK DATA ADA / TIDAK
    if (result.rowCount === 0) {
      throw new Error("Invoice tidak ditemukan");
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Pembayaran invoice berhasil diperbarui",
      data: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal update pembayaran invoice",
      detail: err.message,
    });
  } finally {
    client.release();
  }
}

export async function remove(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id_invoice } = req.body;

    const idInvoiceNum = Number(id_invoice);

    if (!Number.isInteger(idInvoiceNum) || idInvoiceNum <= 0) {
      return res.status(400).json({
        message: "id_invoice harus integer > 0",
      });
    }

    const invoiceResult = await client.query(
      `
      UPDATE tbl_invoice
      SET deleted_at = NOW()
      WHERE id_invoice = $1
      AND deleted_at IS NULL
      RETURNING id_invoice
      `,
      [idInvoiceNum],
    );

    if (invoiceResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Invoice tidak ditemukan atau sudah dihapus",
      });
    }

    const barangKeluar = await client.query(
      `
      SELECT id_barang, jumlah
      FROM tbl_brg_keluar
      WHERE id_invoice = $1
      `,
      [idInvoiceNum],
    );

    // KEMBALIKAN STOCK
    for (const item of barangKeluar.rows) {
      await client.query(
        `
        UPDATE tbl_barang
        SET jumlah = jumlah + $1
        WHERE id_barang = $2
        `,
        [item.jumlah, item.id_barang],
      );
    }

    await client.query(
      `
      UPDATE tbl_brg_keluar
      SET status = 0
      WHERE id_invoice = $1
      `,
      [idInvoiceNum],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Invoice berhasil dihapus (soft delete)",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal soft delete invoice",
      detail: err.message,
    });
  } finally {
    client.release();
  }
}

export async function status(req, res) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id_invoice, status } = req.body;

    // UPDATE STATUS INVOICE
    await client.query(
      `
      UPDATE tbl_invoice
      SET status = $1
      WHERE id_invoice = $2
      `,
      [status, id_invoice],
    );

    // JIKA STATUS DIKIRIM
    if (String(status).toLowerCase() === "dikirim") {
      await client.query(
        `
        UPDATE tbl_brg_keluar
        SET status = 1
        WHERE id_invoice = $1
        `,
        [id_invoice],
      );
    }

    if (String(status).toLowerCase() === "disetujui") {
      await client.query(
        `
        UPDATE tbl_brg_keluar
        SET status = 0
        WHERE id_invoice = $1
        `,
        [id_invoice],
      );
    }

    if (String(status).toLowerCase() === "ditolak") {
      const barangKeluar = await client.query(
        `
        SELECT id_barang, jumlah
        FROM tbl_brg_keluar
        WHERE id_invoice = $1
        `,
        [id_invoice],
      );

      for (const item of barangKeluar.rows) {
        await client.query(
          `
      UPDATE tbl_barang
      SET jumlah = jumlah + $1
      WHERE id_barang = $2
      `,
          [item.jumlah, item.id_barang],
        );
      }

      await client.query(
        `
    UPDATE tbl_brg_keluar
    SET status = 0
    WHERE id_invoice = $1
    `,
        [id_invoice],
      );
    }

    await client.query("COMMIT");

    return res.json({
      message: "Status berhasil diupdate",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal update status",
      detail: err.message,
    });
  } finally {
    client.release();
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

export async function search(req, res) {
  try {
    const { keyword, role, id_user } = req.body;

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

      WHERE
        i.deleted_at IS NULL
        AND (
          p.nama_project ILIKE $1
        )
    `;

    const values = [`%${keyword}%`];

    // FILTER ROLE
    if (role === "Admin Kantor") {
      // semua data
    } else if (role === "Lapangan") {
      query += ` AND i.id_user = $2`;
      values.push(id_user);
    } else if (role === "Gudang") {
      query += `
        AND i.status NOT IN ('menunggu', 'ditolak')
      `;
    }

    query += ` ORDER BY i.id_invoice DESC`;

    const result = await pool.query(query, values);

    return res.json({
      message: "Berhasil mencari data invoice",
      val: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mencari data invoice",
      detail: err.message,
    });
  }
}
