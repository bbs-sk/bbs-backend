import express from "express";
import {
  add,
  update,
  remove,
  getByInvoice,
} from "../controllers/suratJalan.js";

const router = express.Router();

router.get("/invoice/:id_invoice", getByInvoice);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);

export default router;
