<p align="center">
  <img src="assets/images/logo-lockup.png" alt="EcoTrack" width="380">
</p>

# EcoTrack

**Navigate by emissions, not just time.**

EcoTrack is a climate-aware navigation app for Indonesia (Jakarta / Jabodetabek). Instead of only showing you the *fastest* way from A to B, it ranks routes by the **CO₂ they emit** — and overlays a live **air-quality heatmap** plus a **road-emission layer** so you can see the air and the traffic you're driving through. An on-device assistant explains *why* a route is greener and when biking or the bus is actually the smarter call.

It runs **fully on-device** — no backend server.

---

## Install

**Download the latest Android APK from Releases:**

### → https://github.com/SalvatoreCodes/EcoTrack/releases/latest

1. Download the `EcoTrack-v*.apk` asset from the latest release.
2. On your phone, allow **Install unknown apps** for your browser / files app when prompted.
3. Open the APK to install. Requires **Android 7.0+**.

Live routing, air quality, and traffic data are baked into the release build — it works out of the box.

---

## What it does

- **Eco routes** — compares car / motorbike / bus / bike / walk for a trip and highlights the greenest option, with the CO₂ saved vs. the fastest route.
- **Live air-quality heatmap** — real WAQI station readings blended over a modeled baseline, colored clean → polluted.
- **Road-emission layer** — major Jakarta corridors drawn as subtle colored lines by modeled traffic emissions, shown together with the air-quality heatmap.
- **Search & pick-on-map** — search a destination (geocoding) or drop a pin directly on the map.
- **Live-GPS turn-by-turn** — routes from a fresh GPS fix, heading-up follow camera, maneuver banner, live ETA / distance / CO₂.
- **On-device assistant** — explains the emission trade-offs of each route locally (no cloud AI key required).

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Expo](https://expo.dev) SDK 54, React Native 0.81, React 19, TypeScript |
| Navigation / routing (app) | `expo-router` (file-based) |
| Map | [MapLibre GL JS](https://maplibre.org/) in a WebView (native) / iframe (web), CARTO basemap on OpenStreetMap |
| Directions | [OpenRouteService](https://openrouteservice.org/) → keyless [OSRM](https://project-osrm.org/) fallback → synthetic fallback |
| Air quality | [WAQI](https://aqicn.org/api/) live stations, blended with a modeled seed |
| Traffic | [TomTom](https://developer.tomtom.com/) congestion (optional; degrades gracefully) |
| Geolocation | `expo-location` |
| State / storage | [Zustand](https://github.com/pmndrs/zustand) + AsyncStorage (persisted recents) |
| Assistant | On-device explainer (no LLM key bundled) |
| Distribution | Android APK on [GitHub Releases](https://github.com/SalvatoreCodes/EcoTrack/releases) (local Gradle build) |

---

## How it works

**Emission model.** Each route's footprint is estimated as:

```
gCO₂ = Σ (segment_km × mode_factor) × traffic_multiplier
```

Mode factors (g CO₂ / km): **car 170 · motorbike 100 · bus 60 (per passenger) · bike 0 · walk 0.** Traffic congestion (from TomTom, when available) scales the driving figure; without a key it falls back to a moderate multiplier.

**Routing & data flow.** The app talks to the providers directly from the device (`src/lib/providers.ts`):
- `computeRoutes` requests geometry from OpenRouteService, falls back to the keyless OSRM public router, then to a synthetic path if both are unreachable — so routes always render.
- `fetchAir` pulls nearby WAQI stations and blends them over a modeled baseline (Indonesia has sparse station coverage), returning `live` or `sample` source.
- `searchPlaces` / `reverseGeocode` handle destination search and map-pin naming.

**Map bridge.** `EcoMap` renders MapLibre inside a WebView (`mapHtml.ts`) and pushes routes / heatmap / road emissions / markers across a small JS bridge; on web it uses an iframe loaded from a Blob URL.

**Screens.** Map home · Routes (search + pick-on-map) · Assistant · Settings, plus pushed Compare / Navigate / Pick screens.

---

## Develop from source

Requirements: Node.js 18+, npm, and the [Expo Go](https://expo.dev/go) app (SDK 54) on your phone — or a full Android toolchain for a native build.

```bash
git clone https://github.com/SalvatoreCodes/EcoTrack.git
cd EcoTrack
npm install
```

(Optional) Add a `.env` for live data — the app runs without it:

```env
EXPO_PUBLIC_ORS_KEY=your_openrouteservice_key
EXPO_PUBLIC_WAQI_TOKEN=your_waqi_token
EXPO_PUBLIC_TOMTOM_KEY=your_tomtom_key
```

Start the dev server:

```bash
npx expo start
```

Scan the QR code with Expo Go, or press `w` to open the web build.

**Build a release APK locally:**

```bash
npx expo prebuild -p android --clean
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

---

## Project layout

```
src/
├── app/                # expo-router screens ((tabs) + compare/navigate/pick)
├── components/         # EcoMap (WebView map) + map HTML bridge
└── lib/                # providers, emissions model, roads, geo, location, store, config
```

---

## License

Personal / educational project. Not affiliated with the mapping or data providers listed above.
