import type { Lang, Units } from "../../../shared/types";
import { t } from "../lib/i18n";

/** Units (metric/imperial) and language (EN/SW) toggles. */
export function Controls({
  units,
  setUnits,
  lang,
  setLang,
}: {
  units: Units;
  setUnits: (u: Units) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  return (
    <div className="card controls">
      <div className="control-group">
        <span className="control-label">{t("units", lang)}</span>
        <div className="toggle">
          <button className={units === "metric" ? "on" : ""} onClick={() => setUnits("metric")}>
            °C
          </button>
          <button className={units === "imperial" ? "on" : ""} onClick={() => setUnits("imperial")}>
            °F
          </button>
        </div>
      </div>
      <div className="control-group">
        <span className="control-label">{t("language", lang)}</span>
        <div className="toggle">
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
            EN
          </button>
          <button className={lang === "sw" ? "on" : ""} onClick={() => setLang("sw")}>
            SW
          </button>
        </div>
      </div>
    </div>
  );
}
