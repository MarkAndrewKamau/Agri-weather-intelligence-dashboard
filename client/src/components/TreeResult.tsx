import type { Lang, TreeAnalysisResponse } from "../../../shared/types";
import { t } from "../lib/i18n";

/** Side-by-side original vs annotated overlay, health bar, observations + recs. */
export function TreeResult({ result, lang }: { result: TreeAnalysisResponse; lang: Lang }) {
  const h = result.health ?? {};
  const recs = result.recommendations ?? result.ai_recommendations ?? [];
  const obs = result.observations ?? [];
  const total = (h.healthy ?? 0) + (h.needs_care ?? 0) + (h.replace ?? 0);
  const pct = (n?: number) => (total > 0 ? `${Math.round(((n ?? 0) / total) * 100)}%` : "0%");

  return (
    <div className="card result">
      <div className="result-head">
        <div className="stat">
          <span className="stat-num">{result.tree_count ?? "—"}</span>
          <span className="stat-label">{t("treeCount", lang)}</span>
        </div>
      </div>

      {(result.original_image_url || result.overlay_image_url) && (
        <div className="images">
          {result.original_image_url && (
            <figure>
              <img src={result.original_image_url} alt="original" loading="lazy" />
              <figcaption>{t("original", lang)}</figcaption>
            </figure>
          )}
          {result.overlay_image_url && (
            <figure>
              <img src={result.overlay_image_url} alt="annotated" loading="lazy" />
              <figcaption>{t("annotated", lang)}</figcaption>
            </figure>
          )}
        </div>
      )}

      {total > 0 && (
        <div className="health">
          <span className="control-label">{t("health", lang)}</span>
          <div className="health-bar">
            <div className="seg healthy" style={{ width: pct(h.healthy) }} title={`${t("healthy", lang)} ${pct(h.healthy)}`} />
            <div className="seg care" style={{ width: pct(h.needs_care) }} title={`${t("needsCare", lang)} ${pct(h.needs_care)}`} />
            <div className="seg replace" style={{ width: pct(h.replace) }} title={`${t("replace", lang)} ${pct(h.replace)}`} />
          </div>
          <div className="legend">
            <span><i className="dot healthy" /> {t("healthy", lang)} {h.healthy ?? 0}</span>
            <span><i className="dot care" /> {t("needsCare", lang)} {h.needs_care ?? 0}</span>
            <span><i className="dot replace" /> {t("replace", lang)} {h.replace ?? 0}</span>
          </div>
        </div>
      )}

      {obs.length > 0 && (
        <div className="list-block">
          <h4>{t("observations", lang)}</h4>
          <ul>{obs.map((o, i) => <li key={i}>{o}</li>)}</ul>
        </div>
      )}
      {recs.length > 0 && (
        <div className="list-block">
          <h4>✨ {t("recommendations", lang)}</h4>
          <ul>{recs.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
