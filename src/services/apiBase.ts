// Single source of truth for the active API origin.
//
// The renderer talks to exactly one backend at a time: the one belonging to the
// active workspace. Everything that needs the origin (axios, the realtime
// socket, the voice namespace, media URLs, the browser upload fallback) reads it
// from here instead of hardcoding `localhost` or reading `VITE_API_URL` again.
// `setApiBaseUrl` in `services/api.ts` keeps this value in sync with axios.

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

let apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_BASE_URL;

export function getApiBaseUrl(): string {
    return apiBaseUrl;
}

export function setApiBaseUrlValue(url: string): void {
    apiBaseUrl = url;
}
