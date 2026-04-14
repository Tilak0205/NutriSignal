import axios from "axios";

export const api = axios.create({ baseURL: "http://localhost:4000/api" });

export function setAuthToken(token: string | null, role?: string) {
  if (token) {
    localStorage.setItem("token", token);
    if (role) localStorage.setItem("role", role);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    delete api.defaults.headers.common.Authorization;
  }
}

export function initAuth() {
  const token = localStorage.getItem("token");
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export function getRole() {
  return localStorage.getItem("role") ?? "";
}
