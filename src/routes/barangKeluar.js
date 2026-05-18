import express from "express";
import {
  get,
  getIdInvoice,
  add,
  update,
  remove,
} from "../controllers/barangKeluar.js";

const router = express.Router();

router.post("/", get);
router.post("/invoice", getIdInvoice);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);

export default router;
