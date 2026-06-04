import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { cacheKey, getCached, setCached } from "../cache.js";
import { upstreamGet, upstreamPostForm } from "../weatherClient.js";
import { getRateLimit } from "../rateState.js";
import { sendProxied } from "../respond.js";
import type { TreeAnalysisResponse, TreeHistoryResponse } from "../../../shared/types.js";

export const treesRouter = Router();

// Buffer the upload in memory (20MB cap) so we can rebuild the multipart body
// for the upstream call. memoryStorage avoids touching disk on the server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/**
 * The hardest technical bit: forward a browser file upload to upstream's
 * multipart endpoint. We do NOT re-parse boundaries by hand — multer gives us
 * the buffer, then we reconstruct a fresh FormData with Node's global
 * FormData/Blob (Node 18+) and let fetch set the boundary. The GCS-hosted
 * overlay/original image URLs in the response are passed straight through.
 */
treesRouter.post("/trees/analyze", upload.single("image"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "An 'image' file field is required (max 20MB)." });
  }

  const form = new FormData();
  form.append("image", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
  for (const field of ["farmerId", "county", "landAcres", "location", "notes"] as const) {
    const v = req.body?.[field];
    if (typeof v === "string" && v.length) form.append(field, v);
  }

  try {
    const result = await upstreamPostForm<TreeAnalysisResponse>("/v1/trees/analyze", form);
    sendProxied(res, result, { cached: false });
  } catch {
    res.status(502).json({ error: "Upstream tree analysis failed" });
  }
});

treesRouter.get("/trees/history", async (req, res) => {
  const { limit, cursor } = req.query as Record<string, string>;
  const params: Record<string, string> = {};
  if (limit) params.limit = limit;
  if (cursor) params.cursor = cursor;

  const key = cacheKey("/v1/trees/history", params);
  const cached = getCached<TreeHistoryResponse>(key);
  if (cached) {
    return sendProxied(
      res,
      { status: 200, data: cached, rateLimit: getRateLimit(), retryAfter: null },
      { cached: true }
    );
  }
  try {
    const result = await upstreamGet<TreeHistoryResponse>("/v1/trees/history", params);
    if (result.ok) setCached(key, result.data, config.ttl.treeHistory);
    sendProxied(res, result, { cached: false });
  } catch {
    res.status(502).json({ error: "Upstream tree history failed" });
  }
});
