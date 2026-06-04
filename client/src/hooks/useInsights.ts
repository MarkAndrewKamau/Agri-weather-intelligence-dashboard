import { useState } from "react";
import { api, ApiError } from "../api";
import type { Coords } from "./useWeather";
import type { Lang, Units } from "../../../shared/types";

/**
 * On-demand AI insight. Deliberately NOT auto-run: the user clicks to generate,
 * so we only ever spend an AI request (200/mo) when they actually want one.
 */
export function useInsights() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function generate(coords: Coords, units: Units, lang: Lang) {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get<unknown>("/api/insights", {
        lat: coords.lat,
        lon: coords.lon,
        units,
        lang,
      });
      setData(res.data);
    } catch (e) {
      setError(e as ApiError);
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, generate };
}
