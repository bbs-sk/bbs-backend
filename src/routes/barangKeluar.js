import express from "express";
import {
  get,
  getIdInvoice,
  getMonthly,
  getLaporanPenjualan,
  search,
} from "../controllers/barangKeluar.js";
import { monthly } from "../controllers/invoice.js";

const router = express.Router();

router.post("/", get);
router.post("/invoice", getIdInvoice);
router.post("/search", search);
router.get("/monthly", getMonthly);
router.get("/laporan_penjualan", getLaporanPenjualan);

export default router;
