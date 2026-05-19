import express from "express";
import {
  get,
  getIdInvoice,
  add,
  update,
  remove,
  getMonthly,
} from "../controllers/barangKeluar.js";
import { monthly } from "../controllers/invoice.js";

const router = express.Router();

router.post("/", get);
router.post("/invoice", getIdInvoice);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.get("/monthly", getMonthly);

export default router;
