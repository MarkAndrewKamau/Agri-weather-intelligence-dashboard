import { useCallback, useEffect, useState } from "react";
import { api, type ApiMeta } from "../api";
import type { TreeQuota, UsageResponse } from "../../../shared/types";

/**
 * Polls account usage + tree quota for the quota widget. Both are cached
 * server-side (60s) and are the single source of truth for request/AI/tree
 * budgets.
 */
export function useUsage(refreshSignal: number) {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [treeQuota, setTreeQuota] = useState<TreeQuota | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);

  const load = useCallback(async () => {
    try {
      const { data, meta } = await api.get<UsageResponse>("/api/usage");
      setUsage(data);
      setMeta(meta);
    } catch {
      /* widget is best-effort */
    }
    try {
      const { data } = await api.get<TreeQuota>("/api/trees/quota");
      setTreeQuota(data);
    } catch {
      /* trees quota optional */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  return { usage, treeQuota, meta };
}
