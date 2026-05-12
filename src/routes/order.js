import express from "express";
import { get, add, update, remove, approve } from "../controllers/order.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.post("/approve", approve);

export default router;
