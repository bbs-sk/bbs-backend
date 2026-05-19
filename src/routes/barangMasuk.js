import express from "express";
import {
  get,
  add,
  update,
  remove,
  getMonthly,
} from "../controllers/barangMasuk.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.get("/monthly", getMonthly);

export default router;
