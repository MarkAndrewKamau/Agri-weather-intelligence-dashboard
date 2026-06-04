import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dashboard talks ONLY to the backend proxy (VITE_API_BASE_URL); it never
// holds the WeatherAI key. In local dev we proxy /api to the Express server so
// the browser and server share an origin and there are no CORS surprises.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
