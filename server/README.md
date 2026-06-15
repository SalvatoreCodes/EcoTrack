---
title: EcoTrack Server
emoji: 🌿
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# EcoTrack Server

Backend API for the EcoTrack app (climate-emission navigation, Jakarta).
Express, runs as a Docker Space on port 7860.

## Endpoints

- `GET  /api/health` — key status (gate-exempt)
- `POST /api/routes` — emission-ranked routes (ORS / OSRM + TomTom congestion)
- `GET  /api/air` — WAQI air-quality heatmap (live + modeled)
- `POST /api/chat` — Claude assistant (local fallback if no key)

All `/api/*` except `/api/health` require an `x-app-key` header matching the
`APP_KEY` secret, and are rate-limited per IP.

## Secrets (set in Space Settings → Variables and secrets)

`ORS_KEY`, `WAQI_TOKEN`, `TOMTOM_KEY`, `ANTHROPIC_API_KEY`,
`ANTHROPIC_MODEL` (= `claude-haiku-4-5`), `APP_KEY`.
