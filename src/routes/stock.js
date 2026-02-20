import express from "express";
import { get, add, update, remove } from "../controllers/stock.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);

export default router;
