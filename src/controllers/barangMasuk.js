import { pool } from "../config/db.js";

// GET DATA BARANG MASUK
export async function get(req, res) {
  try {
    const result = await pool.query(
      `SELECT 
          bm.id_brg_masuk,
          bm.id_barang,
          b.nama_barang,
          b.kode_barang,
          bm.jumlah,
          bm.harga_beli,
          bm.datetime,
          bm.status
       FROM tbl_brg_masuk bm
       JOIN tbl_barang b 
            ON bm.id_barang = b.id_barang
       WHERE bm.status = 1
       ORDER BY bm.id_brg_masuk DESC`,
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data barang masuk",
      detail: err.message,
    });
  }
}

export async function add(req, res) {
  const client = await pool.connect();

  try {
    const { id_barang, jumlah, harga_beli } = req.body;

    await client.query("BEGIN");

    // Ambil data barang lama
    const barangResult = await client.query(
      `SELECT jumlah, hpp 
       FROM tbl_barang 
       WHERE id_barang = $1`,
      [id_barang],
    );

    if (barangResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const stokLama = Number(barangResult.rows[0].jumlah) || 0;
    const hppLama = Number(barangResult.rows[0].hpp) || 0;

    const stokMasuk = Number(jumlah);
    const hargaBaru = Number(harga_beli);

    const stokTotal = stokLama + stokMasuk;

    let hppBaru = hargaBaru;

    if (stokLama > 0) {
      hppBaru = (stokLama * hppLama + stokMasuk * hargaBaru) / stokTotal;
    }

    const result = await client.query(
      `INSERT INTO tbl_brg_masuk 
        (id_barang, jumlah, harga_beli) 
       VALUES ($1, $2, $3)
       RETURNING id_brg_masuk`,
      [id_barang, stokMasuk, hargaBaru],
    );

    await client.query(
      `UPDATE tbl_barang
       SET jumlah = $1,
           hpp = $2
       WHERE id_barang = $3`,
      [stokTotal, hppBaru, id_barang],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Barang masuk berhasil ditambahkan",
      id: result.rows[0].id_brg_masuk,
      stok_total: stokTotal,
      hpp_baru: hppBaru,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal tambah barang masuk",
      detail: err.message,
    });
  } finally {
    client.release();
  }
}

export async function remove(req, res) {
  const client = await pool.connect();

  try {
    const { id_brg_masuk } = req.body;

    const idNum = Number(id_brg_masuk);

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({
        message: "Parameter id tidak valid",
      });
    }

    await client.query("BEGIN");

    const brgMasuk = await client.query(
      `SELECT 
          id_barang,
          jumlah,
          harga_beli,
          status
       FROM tbl_brg_masuk
       WHERE id_brg_masuk = $1`,
      [idNum],
    );

    if (brgMasuk.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Data barang masuk tidak ditemukan",
      });
    }

    const dataMasuk = brgMasuk.rows[0];

    if (dataMasuk.status === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Barang masuk sudah dinonaktifkan",
      });
    }

    const idBarang = dataMasuk.id_barang;
    const jumlahHapus = Number(dataMasuk.jumlah);
    const hargaBeli = Number(dataMasuk.harga_beli);

    const barang = await client.query(
      `SELECT jumlah, hpp
       FROM tbl_barang
       WHERE id_barang = $1`,
      [idBarang],
    );

    if (barang.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Barang tidak ditemukan",
      });
    }

    const stokSekarang = Number(barang.rows[0].jumlah) || 0;
    const hppSekarang = Number(barang.rows[0].hpp) || 0;

    const stokAkhir = stokSekarang - jumlahHapus;

    if (stokAkhir < 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Stok tidak mencukupi",
      });
    }

    const nilaiSekarang = stokSekarang * hppSekarang;

    const nilaiAkhir = nilaiSekarang - jumlahHapus * hargaBeli;

    let hppBaru = 0;

    if (stokAkhir > 0) {
      hppBaru = nilaiAkhir / stokAkhir;
    }

    await client.query(
      `UPDATE tbl_barang
       SET
          jumlah = $1,
          hpp = $2
       WHERE id_barang = $3`,
      [stokAkhir, hppBaru, idBarang],
    );

    await client.query(
      `UPDATE tbl_brg_masuk
       SET status = 0
       WHERE id_brg_masuk = $1`,
      [idNum],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Barang masuk berhasil dinonaktifkan",
      stok_akhir: stokAkhir,
      hpp_baru: hppBaru,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      message: "Gagal menonaktifkan barang masuk",
      detail: err.message,
    });
  } finally {
    client.release();
  }
}

export async function getMonthly(req, res) {
  try {
    const result = await pool.query(`
      SELECT COALESCE(SUM(CAST(jumlah AS INTEGER)), 0) AS total
      FROM tbl_brg_masuk
      WHERE 
        DATE_PART('month', datetime::date) = DATE_PART('month', CURRENT_DATE)
        AND
        DATE_PART('year', datetime::date) = DATE_PART('year', CURRENT_DATE)
    `);

    return res.json(result.rows[0]);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Gagal ambil barang masuk",
      detail: err.message,
    });
  }
}
