/**
 * EcoTrack backend base URL.
 * Override per-machine with EXPO_PUBLIC_SERVER_URL (e.g. your deployed server).
 * Default = this dev machine's LAN IP so Expo Go on a phone (same Wi-Fi) can reach it.
 */
const fromEnv = process.env.EXPO_PUBLIC_SERVER_URL;
export const SERVER_URL = (fromEnv && fromEnv.trim()) || 'http://192.168.18.7:8787';

/**
 * Shared app key gating the backend (sent as `x-app-key`).
 * Not a real secret — EXPO_PUBLIC_* is baked into the JS bundle and extractable
 * from the APK. It only blocks casual/random hits; rate limiting caps the rest.
 * Must match the server's APP_KEY env var.
 */
export const APP_KEY = (process.env.EXPO_PUBLIC_APP_KEY || '').trim();
