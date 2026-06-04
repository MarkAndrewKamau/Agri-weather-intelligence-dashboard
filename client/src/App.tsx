import { useEffect, useMemo, useState } from "react";
import type { ApiMeta } from "./api";
import { api } from "./api";
import type { Lang, Units, WeatherResponse } from "../../shared/types";
import { t } from "./lib/i18n";
import { placeLabel } from "./lib/format";
import { useWeather, type Coords } from "./hooks/useWeather";
import { useUsage } from "./hooks/useUsage";
import { useTreeAnalysis } from "./hooks/useTreeAnalysis";
import { Controls } from "./components/Controls";
import { LocationSearch } from "./components/LocationSearch";
import { QuotaWidget } from "./components/QuotaWidget";
import { CurrentConditions } from "./components/CurrentConditions";
import { AISummaryCard } from "./components/AISummaryCard";
import { Forecast } from "./components/Forecast";
import { CardSkeleton } from "./components/Skeleton";
import { TreeUpload } from "./components/TreeUpload";
import { TreeResult } from "./components/TreeResult";
import { TreeHistory } from "./components/TreeHistory";
import { RetryNotice } from "./components/RetryNotice";

const DEFAULT: Coords = { lat: -0.7833, lon: 35.3417, label: "Bomet, KE" };

function usePersisted<T extends string>(key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => (localStorage.getItem(key) as T) || fallback);
  useEffect(() => localStorage.setItem(key, v), [key, v]);
  return [v, setV];
}

export default function App() {
  const [units, setUnits] = usePersisted<Units>("units", "metric");
  const [lang, setLang] = usePersisted<Lang>("lang", "en");
  const [tab, setTab] = useState<"weather" | "trees">("weather");
  const [view, setView] = useState<"daily" | "hourly">("daily");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [usageSignal, setUsageSignal] = useState(0);
  const [lastMeta, setLastMeta] = useState<ApiMeta | null>(null);

  // Geo-on-load: detect the user's location via the proxy (which forwards the
  // real client IP), then fall back to a sensible East-African default.
  useEffect(() => {
    let active = true;
    api
      .get<WeatherResponse>("/api/geo")
      .then(({ data }) => {
        if (!active) return;
        const loc = data.location;
        if (loc && typeof loc.lat === "number" && typeof loc.lon === "number") {
          setCoords({
            lat: loc.lat,
            lon: loc.lon,
            label: placeLabel({ timezone: loc.timezone, country: loc.country }),
          });
        } else setCoords(DEFAULT);
      })
      .catch(() => active && setCoords(DEFAULT));
    return () => {
      active = false;
    };
  }, []);

  const weather = useWeather(coords, units, lang, "/api/weather", setLastMeta);
  const { usage, treeQuota, meta: usageMeta } = useUsage(usageSignal);
  const tree = useTreeAnalysis();

  // Bump the usage widget after a tree analysis consumes quota.
  const onAnalyze = useMemo(
    () => (file: File, fields: Record<string, string>) =>
      tree.analyze(file, fields).then(() => setUsageSignal((n) => n + 1)),
    [tree]
  );

  const quotaMeta = lastMeta ?? usageMeta;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🌿</span>
          <h1>{t("appTitle", lang)}</h1>
        </div>
        <nav className="tabs">
          <button className={tab === "weather" ? "on" : ""} onClick={() => setTab("weather")}>
            {t("tabWeather", lang)}
          </button>
          <button className={tab === "trees" ? "on" : ""} onClick={() => setTab("trees")}>
            {t("tabTrees", lang)}
          </button>
        </nav>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <LocationSearch lang={lang} onSelect={setCoords} />
          <Controls units={units} setUnits={setUnits} lang={lang} setLang={setLang} />
          <QuotaWidget usage={usage} treeQuota={treeQuota} meta={quotaMeta} lang={lang} />
        </aside>

        <section className="content">
          {tab === "weather" ? (
            <>
              {weather.error?.status === 429 ? (
                <RetryNotice lang={lang} seconds={weather.error.retryAfter ?? 30} onRetry={weather.reload} />
              ) : weather.error ? (
                <div className="card error-card">
                  <p>{t("loadError", lang)} {weather.error.message}</p>
                  <button onClick={weather.reload}>{t("retry", lang)}</button>
                </div>
              ) : null}

              {weather.loading && !weather.data ? (
                <>
                  <CardSkeleton lines={2} />
                  <CardSkeleton lines={3} />
                  <CardSkeleton lines={4} />
                </>
              ) : weather.data ? (
                <>
                  <CurrentConditions
                    data={weather.data}
                    units={units}
                    lang={lang}
                    locationLabel={coords?.label}
                  />
                  <AISummaryCard
                    coords={coords}
                    units={units}
                    lang={lang}
                    aiRemaining={usage?.remaining?.aiRequests ?? null}
                  />
                  <Forecast data={weather.data} view={view} setView={setView} units={units} lang={lang} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <h2 className="section-title">{t("treesTitle", lang)}</h2>
              <TreeUpload lang={lang} loading={tree.loading} onAnalyze={onAnalyze} />
              {tree.error && (
                <div className="card error-card">
                  <p>{tree.error.message}</p>
                </div>
              )}
              {tree.result && <TreeResult result={tree.result} lang={lang} />}
              <TreeHistory lang={lang} refreshSignal={usageSignal} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
