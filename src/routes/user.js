import express from "express";
import {
  get,
  add,
  update,
  remove,
  login,
  getLapangan,
  search,
} from "../controllers/user.js";

const router = express.Router();

router.post("/", get);
router.post("/add", add);
router.post("/update", update);
router.post("/delete", remove);
router.post("/login", login);
router.post("/get_lapangan", getLapangan);
router.post("/search", search);

export default router;
