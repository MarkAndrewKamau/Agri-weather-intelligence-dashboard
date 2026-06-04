import { useEffect, useState } from "react";
import { api } from "../api";
import type { Lang, TreeAnalysisResponse, TreeHistoryResponse } from "../../../shared/types";
import { t } from "../lib/i18n";

/** Past analyses from /v1/trees/history. Refreshes when `refreshSignal` changes. */
export function TreeHistory({ lang, refreshSignal }: { lang: Lang; refreshSignal: number }) {
  const [items, setItems] = useState<TreeAnalysisResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<TreeHistoryResponse>("/api/trees/history", { limit: 6 })
      .then(({ data }) => {
        if (!active) return;
        setItems(data.analyses ?? data.items ?? data.results ?? []);
      })
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshSignal]);

  if (loading) return <div className="card"><p className="muted">Loading history…</p></div>;
  if (items.length === 0)
    return (
      <div className="card">
        <h3>{t("history", lang)}</h3>
        <p className="muted">No past analyses yet.</p>
      </div>
    );

  return (
    <div className="card">
      <h3>{t("history", lang)}</h3>
      <ul className="history">
        {items.map((it, i) => (
          <li key={it.id ?? i}>
            {it.overlay_image_url || it.original_image_url ? (
              <img src={(it.overlay_image_url || it.original_image_url)!} alt="" loading="lazy" />
            ) : (
              <div className="thumb-placeholder" />
            )}
            <div>
              <strong>{it.tree_count ?? "—"} {t("treeCount", lang).toLowerCase()}</strong>
              <div className="muted small">
                {[it.county, it.created_at].filter(Boolean).join(" · ")}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
