import type { Lang, Units, WeatherResponse } from "../../../shared/types";
import { conditionFromIcon, fmtNum, fmtTemp, placeLabel, speedUnit } from "../lib/format";
import { t } from "../lib/i18n";

/** Hero card: the present-moment conditions for the selected location. */
export function CurrentConditions({
  data,
  units,
  lang,
  locationLabel,
}: {
  data: WeatherResponse;
  units: Units;
  lang: Lang;
  locationLabel?: string;
}) {
  const c = data.current ?? {};
  const place = placeLabel({
    label: locationLabel,
    timezone: data.location?.timezone,
    country: data.location?.country,
  });
  const condition = conditionFromIcon(c.icon, c.icon_path);

  return (
    <div className="card current">
      <div className="card-head">
        <h2>{t("current", lang)}</h2>
        <span className="place">📍 {place}</span>
      </div>
      <div className="current-main">
        {c.icon && <img className="cond-icon" src={c.icon} alt={condition} />}
        <div className="big-temp">{fmtTemp(c.temperature, units)}</div>
        <div className="cond">
          <div className="cond-text">{condition}</div>
          <div className="muted">
            {t("feelsLike", lang)} {fmtTemp(c.feels_like, units)}
          </div>
        </div>
      </div>
      <div className="metrics">
        <div className="metric">
          <span className="metric-label">{t("humidity", lang)}</span>
          <span className="metric-val">{fmtNum(c.humidity, "%")}</span>
        </div>
        <div className="metric">
          <span className="metric-label">{t("wind", lang)}</span>
          <span className="metric-val">{fmtNum(c.wind_speed, ` ${speedUnit(units)}`)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">{t("uv", lang)}</span>
          <span className="metric-val">{fmtNum(c.uv_index)}</span>
        </div>
      </div>
    </div>
  );
}
