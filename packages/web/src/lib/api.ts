import axios from 'axios';

// Resolved at build time by Vite. Set VITE_API_BASE_URL in .env (or
// the deploy environment) — defaults to localhost for local dev so
// running `pnpm dev` "just works" with no extra setup.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export const apiClient = axios.create({
    baseURL,
    withCredentials: true,
});
