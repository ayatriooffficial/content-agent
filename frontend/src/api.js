import axios from "axios";

/**
 * Dynamically picks the backend URL:
 * - If VITE_API_BASE_URL is set in .env → uses that (local dev)
 * - If running on Netlify/Render (window.location is not localhost) → uses production URL
 * - Falls back to localhost if nothing else is available
 */
function getBaseURL() {
  // 1. If explicitly set in .env, always use it (highest priority)
  if (import.meta.env.VITE_API_BASE_URL) {
    return `${import.meta.env.VITE_API_BASE_URL}/api`;
  }

  // 2. Auto-detect: if we are NOT on localhost, use the Render production backend
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (!isLocal) {
    return "https://blog-automation-1-afvy.onrender.com/api";
  }

  // 3. Default fallback for local development
  return "http://localhost:5000/api";
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
});

export default api;
