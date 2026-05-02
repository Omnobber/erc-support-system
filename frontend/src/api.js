import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});

const TOKEN_STORAGE_KEYS = ["token", "erc_token"];
const readStoredToken = () =>
  TOKEN_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((value) => Boolean(value)) || null;
const clearAuthStorage = () => {
  TOKEN_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("erc_user");
};
const isPublicAuthEndpoint = (url = "") => url.includes("/auth/login");
const redirectToLogin = (reason) => {
  if (typeof window === "undefined" || window.location.pathname === "/login") return;
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.assign(`/login?reason=${encodeURIComponent(reason)}&next=${next}`);
};

api.interceptors.request.use((config) => {
  const token = readStoredToken();
  if (import.meta.env.DEV) {
    console.log("Auth token in storage:", token);
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  if (!isPublicAuthEndpoint(config.url)) {
    redirectToLogin("missing-token");
    return Promise.reject(new Error("Not authorized: token missing"));
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";
    const isUnauthorized = status === 401 || /Not authorized/i.test(message);
    const isLoginCall = isPublicAuthEndpoint(error?.config?.url || "");

    if (isUnauthorized && !isLoginCall) {
      clearAuthStorage();
      redirectToLogin("session-expired");
    }

    return Promise.reject(error);
  }
);

export default api;
