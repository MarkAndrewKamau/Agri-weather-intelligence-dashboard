import type { DailyEntry, HourlyEntry, Lang, Units, WeatherResponse } from "../../../shared/types";
import { conditionFromIcon, fmtDay, fmtHour, fmtPct, fmtTemp } from "../lib/format";
import { t } from "../lib/i18n";

type View = "daily" | "hourly";

/**
 * Forecast strip with a daily/hourly toggle. Both arrays come from the single
 * `/v1/weather` payload we already loaded — the standalone `/v1/hourly` and
 * `/v1/current` endpoints currently 500 upstream, and reusing the bundled data
 * also saves a request against the quota.
 */
export function Forecast({
  data,
  view,
  setView,
  units,
  lang,
}: {
  data: WeatherResponse;
  view: View;
  setView: (v: View) => void;
  units: Units;
  lang: Lang;
}) {
  const daily: DailyEntry[] = data.daily ?? [];
  // Show the next 24 hours from "now" rather than from midnight.
  const now = Date.now();
  const hourly: HourlyEntry[] = (data.hourly ?? [])
    .filter((h) => (h.time ? new Date(h.time).getTime() >= now - 3600_000 : true))
    .slice(0, 24);

  return (
    <div className="card forecast">
      <div className="card-head">
        <h3>{t("forecast", lang)}</h3>
        <div className="toggle">
          <button className={view === "daily" ? "on" : ""} onClick={() => setView("daily")}>
            {t("daily", lang)}
          </button>
          <button className={view === "hourly" ? "on" : ""} onClick={() => setView("hourly")}>
            {t("hourly", lang)}
          </button>
        </div>
      </div>

      <div className="strip">
        {view === "daily" &&
          daily.map((d, i) => (
            <div className="strip-cell" key={i}>
              <div className="strip-label">{fmtDay(d.date)}</div>
              {d.icon && <img className="strip-icon" src={d.icon} alt="" />}
              <div className="strip-desc">{conditionFromIcon(d.icon, d.icon_path)}</div>
              <div className="strip-temp">
                <strong>{fmtTemp(d.temp_max, units)}</strong>{" "}
                <span className="muted">{fmtTemp(d.temp_min, units)}</span>
              </div>
              <div className="strip-pop">💧 {fmtPct(d.precipitation_probability)}</div>
            </div>
          ))}

        {view === "hourly" &&
          hourly.map((h, i) => (
            <div className="strip-cell" key={i}>
              <div className="strip-label">{fmtHour(h.time)}</div>
              {h.icon && <img className="strip-icon" src={h.icon} alt="" />}
              <div className="strip-desc">{conditionFromIcon(h.icon, h.icon_path)}</div>
              <div className="strip-temp">
                <strong>{fmtTemp(h.temperature, units)}</strong>
              </div>
              <div className="strip-pop">💧 {fmtPct(h.precipitation_probability)}</div>
            </div>
          ))}

        {view === "daily" && daily.length === 0 && <p className="muted">No daily data available.</p>}
        {view === "hourly" && hourly.length === 0 && <p className="muted">No hourly data available.</p>}
      </div>
    </div>
  );
}
