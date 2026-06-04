import { useState } from "react";
import type { Lang } from "../../../shared/types";
import type { Coords } from "../hooks/useWeather";
import { t } from "../lib/i18n";

/**
 * City search. WeatherAI's free tier has no geocoding endpoint, so we resolve
 * names with Open-Meteo's free, keyless, CORS-friendly geocoder (no secret
 * involved) and then feed the resulting lat/lon to our proxy. Quick presets
 * cover the East-African context the product targets.
 */
const PRESETS: Coords[] = [
  { lat: -0.7833, lon: 35.3417, label: "Bomet, KE" },
  { lat: -1.2921, lon: 36.8219, label: "Nairobi, KE" },
  { lat: -0.0917, lon: 34.768, label: "Kisumu, KE" },
  { lat: -6.7924, lon: 39.2083, label: "Dar es Salaam, TZ" },
  { lat: 0.3476, lon: 32.5825, label: "Kampala, UG" },
];

interface GeoHit {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  admin1?: string;
}

export function LocationSearch({ lang, onSelect }: { lang: Lang; onSelect: (c: Coords) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setHits([]);
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        q
      )}&count=5&language=${lang}`;
      const res = await fetch(url);
      const json = (await res.json()) as { results?: GeoHit[] };
      setHits(json.results ?? []);
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  function pick(h: GeoHit) {
    onSelect({
      lat: h.latitude,
      lon: h.longitude,
      label: [h.name, h.admin1, h.country_code].filter(Boolean).join(", "),
    });
    setHits([]);
    setQ("");
  }

  return (
    <div className="card search">
      <form onSubmit={search} className="search-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder", lang)}
          aria-label={t("search", lang)}
        />
        <button type="submit" disabled={searching}>
          {t("search", lang)}
        </button>
      </form>

      {hits.length > 0 && (
        <ul className="results">
          {hits.map((h, i) => (
            <li key={i}>
              <button onClick={() => pick(h)}>
                {h.name}
                {h.admin1 ? `, ${h.admin1}` : ""} {h.country_code ? `(${h.country_code})` : ""}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.label} className="chip" onClick={() => onSelect(p)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
