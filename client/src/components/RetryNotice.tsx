import { useEffect, useState } from "react";
import type { Lang } from "../../../shared/types";
import { t } from "../lib/i18n";

/**
 * Friendly 429 handler: counts down the server's Retry-After window and auto-
 * retries, instead of crashing or hammering the rate-limited endpoint.
 */
export function RetryNotice({
  lang,
  seconds,
  onRetry,
}: {
  lang: Lang;
  seconds: number;
  onRetry: () => void;
}) {
  const [left, setLeft] = useState(Math.max(1, Math.round(seconds)));

  useEffect(() => {
    setLeft(Math.max(1, Math.round(seconds)));
  }, [seconds]);

  useEffect(() => {
    if (left <= 0) {
      onRetry();
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onRetry]);

  return (
    <div className="card retry">
      <p>
        ⏳ {t("retryIn", lang)} <strong>{left}{t("seconds", lang)}</strong>
      </p>
      <button onClick={onRetry}>{t("retry", lang)}</button>
    </div>
  );
}
