import type { Lang } from "../../../shared/types";

/**
 * Lightweight i18n. WeatherAI is an East African company whose highest-value
 * users are Swahili-reading farmers, so `lang=sw` is passed to the API for AI
 * summaries AND the core UI chrome is translated here. Falls back to English.
 */
const dict = {
  appTitle: { en: "Agri-Weather Intelligence", sw: "Akili ya Hali ya Hewa ya Kilimo" },
  tabWeather: { en: "Weather", sw: "Hali ya Hewa" },
  tabTrees: { en: "Tree Analysis", sw: "Uchambuzi wa Miti" },
  searchPlaceholder: { en: "Search a location…", sw: "Tafuta eneo…" },
  search: { en: "Search", sw: "Tafuta" },
  units: { en: "Units", sw: "Vipimo" },
  language: { en: "Language", sw: "Lugha" },
  current: { en: "Current conditions", sw: "Hali ya sasa" },
  feelsLike: { en: "Feels like", sw: "Inahisi kama" },
  humidity: { en: "Humidity", sw: "Unyevu" },
  wind: { en: "Wind", sw: "Upepo" },
  uv: { en: "UV index", sw: "Kiwango cha UV" },
  aiSummary: { en: "AI insight", sw: "Ufahamu wa AI" },
  generateAi: { en: "Generate AI insight", sw: "Tengeneza ufahamu wa AI" },
  generating: { en: "Generating…", sw: "Inatengeneza…" },
  aiHint: {
    en: "Off by default to protect your AI quota (200/mo). Click to generate a farm-focused summary — uses 1 AI request.",
    sw: "Imezimwa kwa chaguo-msingi kulinda kiwango chako cha AI (200/mwezi). Bofya kutengeneza muhtasari wa shamba — hutumia ombi 1 la AI.",
  },
  aiBudgetLow: {
    en: "AI budget exhausted — generation disabled to protect quota.",
    sw: "Kiwango cha AI kimeisha — utengenezaji umezimwa kulinda kiwango.",
  },
  upgradeNote: {
    en: "AI insights are a Pro/Scale feature on WeatherAI. The app calls the correct endpoint and degrades gracefully on the free plan.",
    sw: "Ufahamu wa AI ni kipengele cha Pro/Scale kwenye WeatherAI. Programu inaita kiungo sahihi na inashusha kwa upole kwenye mpango wa bure.",
  },
  daily: { en: "Daily", sw: "Kila siku" },
  hourly: { en: "Hourly", sw: "Kila saa" },
  forecast: { en: "Forecast", sw: "Utabiri" },
  quota: { en: "API quota", sw: "Kiwango cha API" },
  remaining: { en: "remaining", sw: "kimebaki" },
  treesTitle: { en: "Tree canopy analysis", sw: "Uchambuzi wa dari ya miti" },
  uploadHint: {
    en: "Drag & drop an aerial/field image, or click to choose (JPG/PNG/WebP, max 20MB)",
    sw: "Buruta na udondoshe picha ya angani/shamba, au bofya kuchagua (JPG/PNG/WebP, juu ya 20MB)",
  },
  analyze: { en: "Analyze", sw: "Chambua" },
  analyzing: { en: "Analyzing…", sw: "Inachambua…" },
  treeCount: { en: "Trees detected", sw: "Miti iliyogunduliwa" },
  health: { en: "Canopy health", sw: "Afya ya dari" },
  healthy: { en: "Healthy", sw: "Yenye afya" },
  needsCare: { en: "Needs care", sw: "Inahitaji uangalizi" },
  replace: { en: "Replace", sw: "Badilisha" },
  observations: { en: "Observations", sw: "Maoni" },
  recommendations: { en: "Recommendations", sw: "Mapendekezo" },
  original: { en: "Original", sw: "Asili" },
  annotated: { en: "Annotated", sw: "Iliyofafanuliwa" },
  history: { en: "Recent analyses", sw: "Uchambuzi wa hivi karibuni" },
  retryIn: { en: "Rate limited. Retry in", sw: "Kikomo kimefikiwa. Jaribu tena baada ya" },
  seconds: { en: "s", sw: "s" },
  loadError: { en: "Could not load data.", sw: "Imeshindwa kupakia data." },
  retry: { en: "Retry", sw: "Jaribu tena" },
} as const;

export type MsgKey = keyof typeof dict;

export function t(key: MsgKey, lang: Lang): string {
  return dict[key][lang] ?? dict[key].en;
}
