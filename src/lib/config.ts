/**
 * EcoTrack runs fully on-device — no backend.
 * Free-tier provider keys are bundled via EXPO_PUBLIC_* (baked into the JS bundle at
 * build time). These are low-risk: rate-limited, no billing, regenerable. The Anthropic
 * key is intentionally NOT bundled (real-money risk) — chat uses the local explainer.
 *
 * Local dev: put EXPO_PUBLIC_ORS_KEY / _TOMTOM_KEY / _WAQI_TOKEN in a gitignored `.env`.
 * EAS builds: set them as EAS environment variables (preview/production).
 */
export const ORS_KEY = (process.env.EXPO_PUBLIC_ORS_KEY || '').trim();
export const TOMTOM_KEY = (process.env.EXPO_PUBLIC_TOMTOM_KEY || '').trim();
export const WAQI_TOKEN = (process.env.EXPO_PUBLIC_WAQI_TOKEN || '').trim();
