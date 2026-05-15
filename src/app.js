import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import userRoutes from "./routes/user.js";
import barangRoutes from "./routes/barang.js";
import invoiceRoutes from "./routes/invoice.js";
import projectRoutes from "./routes/project.js";
import stockRoutes from "./routes/stock.js";
import orderRoutes from "./routes/order.js";
import brgMasukRoutes from "./routes/barangMasuk.js";
import brgKeluarRoutes from "./routes/barangKeluar.js";
import returRoutes from "./routes/retur.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/user", userRoutes);
app.use("/api/barang", barangRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/stock", stockRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/brgMasuk", brgMasukRoutes);
app.use("/api/brgKeluar", brgKeluarRoutes);
app.use("/api/retur", returRoutes);

export default app;
