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

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

app.use(express.json({ limit: "1mb" }));
app.use(cors());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/user", userRoutes);
app.use("/barang", barangRoutes);
app.use("/invoice", invoiceRoutes);
app.use("/project", projectRoutes);
app.use("/stock", stockRoutes);

export default app;
