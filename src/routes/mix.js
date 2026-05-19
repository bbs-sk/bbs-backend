import express from "express";
import { getActivity } from "../controllers/mix.js";

const router = express.Router();

router.get("/activity", getActivity);

export default router;
