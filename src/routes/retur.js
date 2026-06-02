import express from "express";
import { get, add, search, getReturByInvoice } from "../controllers/retur.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/search", search);
router.get("/invoice/:id_invoice", getReturByInvoice);

export default router;
