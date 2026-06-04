import type { Lang, Units } from "../../../shared/types";
import type { Coords } from "../hooks/useWeather";
import { useInsights } from "../hooks/useInsights";
import { t } from "../lib/i18n";

/** Pull any human-readable narrative strings out of an unknown insights payload. */
function extractText(d: unknown): string {
  const out: string[] = [];
  const walk = (o: unknown) => {
    if (typeof o === "string") {
      if (o.trim().length > 20) out.push(o.trim());
    } else if (Array.isArray(o)) o.forEach(walk);
    else if (o && typeof o === "object") Object.values(o).forEach(walk);
  };
  walk(d);
  return out.join("\n\n");
}

/**
 * AI insight card. AI is an ENHANCEMENT, not a requirement, and the scarcest
 * budget (200/mo), so it is OFF by default and generated only on click. The
 * real endpoint (/v1/insights) is Pro/Scale-gated — on the free plan we render
 * the 403 as a clean notice instead of a broken state.
 */
export function AISummaryCard({
  coords,
  units,
  lang,
  aiRemaining,
}: {
  coords: Coords | null;
  units: Units;
  lang: Lang;
  aiRemaining: number | null;
}) {
  const ins = useInsights();
  const budgetLow = aiRemaining !== null && aiRemaining <= 0;
  const text = extractText(ins.data);

  return (
    <div className="card ai">
      <div className="card-head">
        <h3>✨ {t("aiSummary", lang)}</h3>
        <button
          className="primary ai-gen"
          disabled={!coords || ins.loading || budgetLow}
          onClick={() => coords && ins.generate(coords, units, lang)}
        >
          {ins.loading ? t("generating", lang) : t("generateAi", lang)}
        </button>
      </div>

      {ins.error ? (
        <div className="ai-degraded">
          <p>{ins.error.message}</p>
          {ins.error.status === 403 && <p className="muted small">{t("upgradeNote", lang)}</p>}
        </div>
      ) : text ? (
        <p className="ai-text">{text}</p>
      ) : (
        <p className="muted">{budgetLow ? t("aiBudgetLow", lang) : t("aiHint", lang)}</p>
      )}
    </div>
  );
}
