import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { weatherRouter } from "./routes/weather.js";
import { usageRouter } from "./routes/usage.js";
import { treesRouter } from "./routes/trees.js";

// Last line of defence: a stray rejection/exception (e.g. from the flaky
// upstream) must never crash the single free instance into a restart loop.
// Log and keep serving — routes already convert handled errors into clean 5xx.
process.on("unhandledRejection", (reason) => {
  console.error("unhandledRejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("uncaughtException:", err);
});

const app = express();

// Render terminates TLS at a proxy; trust it so req.ip / X-Forwarded-For reflect
// the real client, not the load balancer.
app.set("trust proxy", true);

app.use(
  cors({
    origin: config.allowedOrigins,
    // Expose our operational headers so the browser quota widget can read them.
    exposedHeaders: [
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "X-Cache",
      "X-Stale",
      "X-AI-Degraded",
      "Retry-After",
    ],
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "agri-weather-proxy" }));

app.use("/api", weatherRouter);
app.use("/api", usageRouter);
app.use("/api", treesRouter);

// Final error handler — covers multer's file-size rejection and anything unhandled.
app.use(
  (err: Error & { code?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Image exceeds the 20MB limit." });
    }
    console.error("Unhandled error:", err?.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(config.port, () => {
  console.log(`agri-weather proxy listening on :${config.port}`);
  console.log(`CORS allowed origins: ${config.allowedOrigins.join(", ")}`);
});
