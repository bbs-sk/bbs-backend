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

export async function getKartuStock(req, res) {
  const { id_barang, startDate, endDate } = req.body;

  if (!id_barang || !startDate || !endDate) {
    return res.status(400).json({
      message: "id_barang, startDate, dan endDate wajib diisi",
    });
  }

  try {
    const idBarangNum = Number(id_barang);
    const startStr = `${startDate} 00:00:00`;
    const endStr = `${endDate} 23:59:59`;

    // 1. Ambil info barang
    const barangResult = await pool.query(
      `SELECT nama_barang, kode_barang, satuan FROM tbl_barang WHERE id_barang = $1`,
      [idBarangNum],
    );

    if (barangResult.rows.length === 0) {
      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const barangInfo = barangResult.rows[0];

    // 2. Hitung Stok Awal sebelum startDate
    // Masuk
    const masukSebelum = await pool.query(
      `SELECT COALESCE(SUM(jumlah), 0) AS total FROM tbl_brg_masuk WHERE id_barang = $1 AND status = 1 AND datetime < $2::timestamp`,
      [idBarangNum, startStr],
    );
    // Keluar
    const keluarSebelum = await pool.query(
      `SELECT COALESCE(SUM(bk.jumlah), 0) AS total 
       FROM tbl_brg_keluar bk
       LEFT JOIN tbl_invoice i ON bk.id_invoice = i.id_invoice
       WHERE bk.id_barang = $1 
         AND (bk.id_invoice IS NULL OR (i.deleted_at IS NULL AND i.status != 'ditolak'))
         AND bk.datetime < $2::timestamp`,
      [idBarangNum, startStr],
    );
    // Retur (retur mengurangi stok barang rusak)
    const returSebelum = await pool.query(
      `SELECT COALESCE(SUM(jumlah), 0) AS total FROM tbl_retur WHERE id_barang = $1 AND status = 1 AND datetime < $2::timestamp`,
      [idBarangNum, startStr],
    );

    const stokAwal =
      Number(masukSebelum.rows[0].total) -
      Number(keluarSebelum.rows[0].total) -
      Number(returSebelum.rows[0].total);

    // 3. Ambil mutasi dalam range tanggal
    const mutasiResult = await pool.query(
      `SELECT * FROM (
        SELECT 
          'masuk' AS tipe,
          id_brg_masuk AS id_transaksi,
          TO_CHAR(datetime, 'YYYY-MM-DD HH24:MI:SS') AS datetime,
          jumlah,
          harga_beli AS harga,
          'Barang Masuk' AS keterangan
        FROM tbl_brg_masuk
        WHERE id_barang = $1 AND status = 1 AND datetime >= $2::timestamp AND datetime <= $3::timestamp

        UNION ALL

        SELECT 
          'keluar' AS tipe,
          bk.id_brg_keluar AS id_transaksi,
          TO_CHAR(bk.datetime, 'YYYY-MM-DD HH24:MI:SS') AS datetime,
          bk.jumlah,
          bk.harga_jual AS harga,
          COALESCE(p.nama_project, 'Barang Keluar') AS keterangan
        FROM tbl_brg_keluar bk
        LEFT JOIN tbl_invoice i ON bk.id_invoice = i.id_invoice
        LEFT JOIN tbl_project p ON i.id_project = p.id_project
        WHERE bk.id_barang = $1 
          AND (bk.id_invoice IS NULL OR (i.deleted_at IS NULL AND i.status != 'ditolak'))
          AND bk.datetime >= $2::timestamp AND bk.datetime <= $3::timestamp

        UNION ALL

        SELECT 
          'retur' AS tipe,
          r.id_retur AS id_transaksi,
          TO_CHAR(r.datetime, 'YYYY-MM-DD HH24:MI:SS') AS datetime,
          r.jumlah,
          r.harga_jual AS harga,
          CONCAT('Retur (', r.kondisi, ')') AS keterangan
        FROM tbl_retur r
        WHERE r.id_barang = $1 AND r.status = 1 AND r.datetime >= $2::timestamp AND r.datetime <= $3::timestamp
      ) AS mutasi
      ORDER BY datetime ASC, id_transaksi ASC`,
      [idBarangNum, startStr, endStr],
    );

    // 4. Kalkulasi running balance (stok setelah mutasi)
    let currentStock = stokAwal;
    const mutasi = mutasiResult.rows.map((row) => {
      const qty = Number(row.jumlah);
      if (row.tipe === "masuk") {
        currentStock += qty;
      } else {
        // keluar atau retur mengurangi stok
        currentStock -= qty;
      }
      return {
        ...row,
        saldo_akhir: currentStock,
      };
    });

    return res.json({
      barang: barangInfo,
      stok_awal: stokAwal,
      mutasi,
      stok_akhir: currentStock,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mengambil data kartu stok",
      detail: err.message,
    });
  }
}

export async function getKartuStokSemua(req, res) {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({
      message: "startDate dan endDate wajib diisi",
    });
  }

  try {
    const startStr = `${startDate} 00:00:00`;
    const endStr = `${endDate} 23:59:59`;

    // 1. Ambil semua barang aktif
    const barangResult = await pool.query(
      `SELECT id_barang, kode_barang, nama_barang, satuan
       FROM tbl_barang
       WHERE status = '1'
       ORDER BY id_barang ASC`,
    );

    const semuaBarang = barangResult.rows;
    if (semuaBarang.length === 0) {
      return res.json([]);
    }

    // 2. Batch query masuk SEBELUM startDate (per id_barang)
    const masukSebelumResult = await pool.query(
      `SELECT id_barang, COALESCE(SUM(jumlah), 0) AS total
       FROM tbl_brg_masuk
       WHERE status = 1 AND datetime < $1::timestamp
       GROUP BY id_barang`,
      [startStr],
    );

    // 3. Batch query keluar SEBELUM startDate (per id_barang)
    const keluarSebelumResult = await pool.query(
      `SELECT bk.id_barang, COALESCE(SUM(bk.jumlah), 0) AS total
       FROM tbl_brg_keluar bk
       LEFT JOIN tbl_invoice i ON bk.id_invoice = i.id_invoice
       WHERE (bk.id_invoice IS NULL OR (i.deleted_at IS NULL AND i.status != 'ditolak'))
         AND bk.datetime < $1::timestamp
       GROUP BY bk.id_barang`,
      [startStr],
    );

    // 4. Batch query retur SEBELUM startDate (per id_barang)
    const returSebelumResult = await pool.query(
      `SELECT id_barang, COALESCE(SUM(jumlah), 0) AS total
       FROM tbl_retur
       WHERE status = 1 AND datetime < $1::timestamp
       GROUP BY id_barang`,
      [startStr],
    );

    // 5. Batch query masuk DALAM rentang (per id_barang)
    const masukDalamResult = await pool.query(
      `SELECT id_barang, COALESCE(SUM(jumlah), 0) AS total
       FROM tbl_brg_masuk
       WHERE status = 1 AND datetime >= $1::timestamp AND datetime <= $2::timestamp
       GROUP BY id_barang`,
      [startStr, endStr],
    );

    // 6. Batch query keluar DALAM rentang (per id_barang)
    const keluarDalamResult = await pool.query(
      `SELECT bk.id_barang, COALESCE(SUM(bk.jumlah), 0) AS total
       FROM tbl_brg_keluar bk
       LEFT JOIN tbl_invoice i ON bk.id_invoice = i.id_invoice
       WHERE (bk.id_invoice IS NULL OR (i.deleted_at IS NULL AND i.status != 'ditolak'))
         AND bk.datetime >= $1::timestamp AND bk.datetime <= $2::timestamp
       GROUP BY bk.id_barang`,
      [startStr, endStr],
    );

    // 7. Batch query retur DALAM rentang — digabung ke keluar (Opsi A)
    const returDalamResult = await pool.query(
      `SELECT id_barang, COALESCE(SUM(jumlah), 0) AS total
       FROM tbl_retur
       WHERE status = 1 AND datetime >= $1::timestamp AND datetime <= $2::timestamp
       GROUP BY id_barang`,
      [startStr, endStr],
    );

    // Helper: buat map id_barang -> total
    const toMap = (rows) => {
      const map = {};
      rows.forEach((r) => { map[r.id_barang] = Number(r.total); });
      return map;
    };

    const mapMasukSebelum  = toMap(masukSebelumResult.rows);
    const mapKeluarSebelum = toMap(keluarSebelumResult.rows);
    const mapReturSebelum  = toMap(returSebelumResult.rows);
    const mapMasukDalam    = toMap(masukDalamResult.rows);
    const mapKeluarDalam   = toMap(keluarDalamResult.rows);
    const mapReturDalam    = toMap(returDalamResult.rows);

    // 8. Hitung ringkasan per barang
    const hasil = semuaBarang.map((b) => {
      const id = b.id_barang;
      const stokAwal =
        (mapMasukSebelum[id] || 0) -
        (mapKeluarSebelum[id] || 0) -
        (mapReturSebelum[id] || 0);

      const totalMasuk  = mapMasukDalam[id] || 0;
      const totalKeluar = (mapKeluarDalam[id] || 0) + (mapReturDalam[id] || 0);
      const stokAkhir   = stokAwal + totalMasuk - totalKeluar;

      return {
        id_barang:    id,
        kode_barang:  b.kode_barang,
        nama_barang:  b.nama_barang,
        satuan:       b.satuan,
        stok_awal:    stokAwal,
        total_masuk:  totalMasuk,
        total_keluar: totalKeluar,
        stok_akhir:   stokAkhir,
      };
    });

    return res.json(hasil);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mengambil data kartu stok semua barang",
      detail: err.message,
    });
  }
}
