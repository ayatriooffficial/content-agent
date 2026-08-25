import axios from "axios";

/**
 * Dynamically picks the backend URL:
 * - If VITE_API_BASE_URL is set in .env → uses that (local dev)
 * - If running on Netlify/Render (window.location is not localhost) → uses production URL
 * - Falls back to localhost if nothing else is available
 */
function getBaseURL() {
  if (import.meta.env.VITE_API_BASE_URL) {
    const raw = String(import.meta.env.VITE_API_BASE_URL).trim().replace(/\/+$/, "");
    return raw.endsWith("/api") ? raw : `${raw}/api`;
  }

  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isLocal) {
    return "https://content-agent-u1on.onrender.com/api";
  }

  return "http://localhost:5003/api";
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

export default api;
