import express from "express";
import {
  get,
  add,
  remove,
  getMonthly,
  search,
} from "../controllers/barangMasuk.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/delete", remove);
router.get("/monthly", getMonthly);
router.post("/search", search);

export default router;
