import { useState } from "react";
import { api, ApiError } from "../api";
import type { TreeAnalysisResponse } from "../../../shared/types";

/** Drives a single tree image upload + analysis. */
export function useTreeAnalysis() {
  const [result, setResult] = useState<TreeAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function analyze(file: File, fields: Record<string, string>) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", file);
      for (const [k, v] of Object.entries(fields)) if (v) form.append(k, v);
      const { data } = await api.postForm<TreeAnalysisResponse>("/api/trees/analyze", form);
      setResult(data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }

  return { result, loading, error, analyze };
}
