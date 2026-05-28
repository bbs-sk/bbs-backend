import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

export async function get(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM tbl_user
      ORDER BY status DESC, id_user DESC
      `,
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
  const { name, role, username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO tbl_user (name, role, username, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id_user`,
      [name, role, username, hashedPassword],
    );

    return res.status(201).json({
      message: "User berhasil ditambahkan",
      id: result.rows[0].id_user,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Gagal tambah data",
      detail: err.message,
    });
  }
}

export async function update(req, res) {
  const { id_user, name, role, username, password } = req.body;

  if (!id_user) {
    return res.status(400).json({
      message: "id_user wajib diisi",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      `UPDATE tbl_user
       SET name = $1,
           role = $2,
           username = $3,
           password = $4
       WHERE id_user = $5`,
      [name, role, username, hashedPassword, id_user],
    );

    return res.json({
      message: "User berhasil diupdate",
      affectedRows: result.rowCount,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Gagal update data",
      detail: err.message,
    });
  }
}

export async function remove(req, res) {
  const { id_user } = req.body;

  if (!id_user) {
    return res.status(400).json({
      message: "id_user wajib diisi",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_user 
       SET status = 0 
       WHERE id_user = $1`,
      [id_user],
    );

    return res.json({
      message: "User berhasil dinonaktifkan",
      affectedRows: result.rowCount,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal update data",
      detail: err.message,
    });
  }
}

export async function restore(req, res) {
  const { id_user } = req.body;

  if (!id_user) {
    return res.status(400).json({
      message: "id_user wajib diisi",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE tbl_user
       SET status = 1
       WHERE id_user = $1`,
      [id_user],
    );

    return res.json({
      message: "User berhasil diaktifkan kembali",
      affectedRows: result.rowCount,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mengaktifkan user",
      detail: err.message,
    });
  }
}

export async function login(req, res) {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT *
       FROM tbl_user
       WHERE username = $1`,
      [username],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Username tidak ditemukan",
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Password salah",
      });
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_KEY,
      {
        expiresIn: "1d",
      },
    );

    return res.json({
      message: "Login berhasil",
      token,
      user: {
        id_user: user.id_user,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Login gagal",
      detail: err.message,
    });
  }
}

export async function getLapangan(req, res) {
  try {
    const result = await pool.query(
      `SELECT id_user, name
       FROM tbl_user
       WHERE LOWER(role) = LOWER($1)
       ORDER BY id_user DESC`,
      ["lapangan"],
    );

    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({
      message: "Gagal ambil data user lapangan",
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
      FROM tbl_user
      WHERE
        name ILIKE $1
        OR username ILIKE $1
        OR role ILIKE $1
      ORDER BY id_user DESC
      `,
      [`%${keyword}%`],
    );

    return res.json({
      message: "Berhasil mencari data",
      val: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Gagal mencari data",
      detail: err.message,
    });
  }
}
