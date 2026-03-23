import axios from 'axios';

const apiClient = axios.create({
    headers: {
        'Content-Type': 'application/json',
    },
});

// Initialize with default
apiClient.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Dynamic base URL for workspace switching
export function setApiBaseUrl(url: string) {
    apiClient.defaults.baseURL = url;
}

function getWorkspaceTokenKey(key: string): string {
    const wsId = localStorage.getItem('activeWorkspaceId') || 'default';
    return `${key}_${wsId}`;
}

// Request interceptor: attach auth token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(getWorkspaceTokenKey('accessToken'));
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
    failedQueue.forEach((prom) => {
        if (token) {
            prom.resolve(token);
        } else {
            prom.reject(error);
        }
    });
    failedQueue = [];
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        // Don't retry auth endpoints
        if (originalRequest.url?.startsWith('/auth/')) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({
                    resolve: (token: string) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        resolve(apiClient(originalRequest));
                    },
                    reject,
                });
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refreshToken = localStorage.getItem(getWorkspaceTokenKey('refreshToken'));
        if (!refreshToken) {
            isRefreshing = false;
            localStorage.removeItem(getWorkspaceTokenKey('accessToken'));
            localStorage.removeItem(getWorkspaceTokenKey('refreshToken'));
            window.location.hash = '#/login';
            return Promise.reject(error);
        }

        try {
            const { data } = await apiClient.post('/auth/refresh', { refreshToken });
            localStorage.setItem(getWorkspaceTokenKey('accessToken'), data.accessToken);
            localStorage.setItem(getWorkspaceTokenKey('refreshToken'), data.refreshToken);
            processQueue(null, data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return apiClient(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            localStorage.removeItem(getWorkspaceTokenKey('accessToken'));
            localStorage.removeItem(getWorkspaceTokenKey('refreshToken'));
            window.location.hash = '#/login';
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    },
);

// Register offline interceptors (must be after auth interceptors)
import { registerOfflineInterceptors } from './offline/offlineInterceptor';
registerOfflineInterceptors(apiClient);

export default apiClient;
