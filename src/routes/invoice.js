import express from "express";
import {
  get,
  add,
  update,
  remove,
  status,
  monthly,
  wait,
  recent,
} from "../controllers/invoice.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.post("/status", status);
router.get("/monthly", monthly);
router.get("/wait", wait);
router.post("/recent", recent);

export default router;
