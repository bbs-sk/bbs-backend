import express from "express";
import { get, add, update, remove, search } from "../controllers/retur.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.post("/search", search);

export default router;
