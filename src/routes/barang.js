import express from "express";
import {
  get,
  add,
  update,
  remove,
  getTotal,
  search,
  getKartuStock,
} from "../controllers/barang.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.get("/total", getTotal);
router.post("/search", search);
router.post("/kartu-stok", getKartuStock);

export default router;
