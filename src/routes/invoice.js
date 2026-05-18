import express from "express";
import { get, add, update, remove, status } from "../controllers/invoice.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.post("/status", status);

export default router;
