import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type ApiMeta } from "../api";
import type { Lang, Units, WeatherResponse } from "../../../shared/types";

export interface Coords {
  lat: number;
  lon: number;
  label?: string;
}

interface State {
  data: WeatherResponse | null;
  meta: ApiMeta | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Loads weather for a location from the given proxy endpoint. The main view uses
 * `/api/weather` (current + AI + daily); the forecast strip reuses this hook
 * with `/api/hourly` for the hourly toggle.
 */
export function useWeather(
  coords: Coords | null,
  units: Units,
  lang: Lang,
  endpoint: "/api/weather" | "/api/hourly" | "/api/daily",
  onMeta?: (m: ApiMeta) => void
) {
  const [state, setState] = useState<State>({ data: null, meta: null, loading: false, error: null });
  // Keep the latest onMeta without making it a fetch dependency (avoids loops).
  const metaCb = useRef(onMeta);
  metaCb.current = onMeta;

  const load = useCallback(async () => {
    if (!coords) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, meta } = await api.get<WeatherResponse>(endpoint, {
        lat: coords.lat,
        lon: coords.lon,
        units,
        lang,
        days: 7,
      });
      setState({ data, meta, loading: false, error: null });
      metaCb.current?.(meta);
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e as ApiError }));
    }
  }, [coords, units, lang, endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
}
