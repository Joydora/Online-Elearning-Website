import axios from 'axios';

// Resolved at build time by Vite. Set VITE_API_BASE_URL in .env (or
// the deploy environment) — defaults to localhost for local dev so
// running `pnpm dev` "just works" with no extra setup.
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api';

export const apiClient = axios.create({
    baseURL,
    withCredentials: true,
});

// Add token to every request
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('API Request - Token:', token ? 'exists' : 'missing', 'URL:', config.url);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);