import type { ApiMeta } from "../api";
import type { Lang, TreeQuota, UsageResponse } from "../../../shared/types";
import { t } from "../lib/i18n";

/**
 * Surfaces the operational reality of a metered API: monthly request / AI / tree
 * budgets from /v1/usage + /v1/trees/quota, plus the live per-minute ratelimit
 * snapshot from the last call. Reading and showing these is a deliberate signal
 * that we read the docs and thought about quota.
 */
function Bar({ label, used, limit, warn }: { label: string; used?: number; limit?: number; warn?: boolean }) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round(((used ?? 0) / limit) * 100)) : 0;
  const remaining = limit !== undefined ? Math.max(0, limit - (used ?? 0)) : undefined;
  return (
    <div className="quota-row">
      <div className="quota-label">
        <span>{label}</span>
        <span className="quota-num">
          {remaining ?? "—"}
          {limit !== undefined ? ` / ${limit}` : ""}
        </span>
      </div>
      <div className="quota-track">
        <div className={`quota-fill${warn && pct > 80 ? " warn" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function QuotaWidget({
  usage,
  treeQuota,
  meta,
  lang,
}: {
  usage: UsageResponse | null;
  treeQuota: TreeQuota | null;
  meta: ApiMeta | null;
  lang: Lang;
}) {
  const rl = meta?.rateLimit;
  return (
    <div className="card quota">
      <div className="card-head">
        <h3>{t("quota", lang)}</h3>
        {usage?.plan && <span className="pill">{usage.plan}</span>}
      </div>

      {usage ? (
        <>
          <Bar label="Requests" used={usage.period?.requestCount} limit={usage.limits?.requests} />
          <Bar label="AI" used={usage.period?.aiRequestCount} limit={usage.limits?.aiRequests} warn />
          {treeQuota && <Bar label="Trees" used={treeQuota.used} limit={treeQuota.limit} warn />}
        </>
      ) : (
        <p className="muted">Loading usage…</p>
      )}

      {rl && rl.remaining !== null && (
        <p className="muted small">
          Burst: {rl.remaining}
          {rl.limit !== null ? `/${rl.limit}` : ""}/min{meta?.cached ? " · cache HIT" : ""}
        </p>
      )}
    </div>
  );
}
