import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';

import { computeRoutes, fetchAir } from './lib.mjs';

const app = express();
app.set('trust proxy', 1); // Render/other proxies -> correct client IP for rate limiter
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8787;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const APP_KEY = process.env.APP_KEY || '';
const keys = () => ({
  ors: process.env.ORS_KEY || '',
  waqi: process.env.WAQI_TOKEN || '',
  tomtom: process.env.TOMTOM_KEY || '',
  anthropic: process.env.ANTHROPIC_API_KEY || '',
});

// Per-IP rate limit (caps abuse / quota burn). Health check exempt.
const limiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false });

// Gate + limit everything under /api except /api/health.
// APP_KEY unset (local dev) -> gate skipped, backwards compatible.
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (APP_KEY && req.get('x-app-key') !== APP_KEY) return res.status(401).json({ error: 'unauthorized' });
  return limiter(req, res, next);
});

app.get('/api/health', (_req, res) => {
  const k = keys();
  res.json({
    ok: true,
    keys: { ors: !!k.ors, waqi: !!k.waqi, tomtom: !!k.tomtom, anthropic: !!k.anthropic },
    model: MODEL,
  });
});

app.post('/api/routes', async (req, res) => {
  try {
    const { origin, dest, mode = 'car' } = req.body || {};
    if (!origin?.coord || !dest?.coord) return res.status(400).json({ error: 'origin and dest with coord required' });
    const routes = await computeRoutes(origin.coord, dest.coord, mode, keys());
    res.json({ routes });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.get('/api/air', async (_req, res) => {
  try {
    res.json(await fetchAir(keys().waqi));
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages = [], context = {} } = req.body || {};
  const k = keys();
  const sys = buildSystem(context);
  if (!k.anthropic) return res.json({ reply: localReply(messages, context), source: 'local' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': k.anthropic, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system: sys,
        messages: messages
          .filter((m) => m.text?.trim())
          .map((m) => ({ role: m.role === 'me' ? 'user' : 'assistant', content: m.text })),
      }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error?.message || `Anthropic ${r.status}`);
    const reply = (j.content || []).map((c) => c.text || '').join('').trim();
    res.json({ reply: reply || localReply(messages, context), source: 'claude' });
  } catch (e) {
    res.json({ reply: localReply(messages, context), source: 'local', warning: String(e?.message || e) });
  }
});

function buildSystem(context) {
  const { routes = [], selectedId, destName } = context;
  const lines = routes
    .map((r) => `- ${r.label} (${r.mode}): ${r.kg} kg CO2, ${r.distanceKm} km, ${r.durationMin} min${r.greenest ? ' [greenest]' : ''}${r.id === selectedId ? ' [selected]' : ''}`)
    .join('\n');
  return [
    'You are the EcoTrack in-app assistant for commuters in Jakarta, Indonesia.',
    'Help the user understand why a route is lower-emission and whether biking or public transit (TransJakarta/KRL) is more convenient.',
    'Voice: a knowledgeable local guide. Encouraging, never preachy or guilt-tripping. Be honest about tradeoffs (e.g. "+5 min, -38% emissions"). Keep replies to 2-4 short sentences.',
    destName ? `Destination: ${destName}.` : '',
    routes.length ? `Current route options:\n${lines}` : 'No routes computed yet.',
  ]
    .filter(Boolean)
    .join('\n');
}

// Local fallback so chat works with no Anthropic key.
function localReply(messages, context) {
  const q = (messages[messages.length - 1]?.text || '').toLowerCase();
  const routes = context.routes || [];
  const bike = routes.find((r) => r.mode === 'bike');
  if (q.includes('bik') || q.includes('cycl') || q.includes('sepeda'))
    return bike
      ? `By bike it's ${bike.distanceKm} km, ~${bike.durationMin} min, 0 kg CO2. If it isn't raining, it's the greenest option and you skip parking.`
      : `This trip is a bit far for a comfortable ride, so I'd lean toward the EcoRoute or transit.`;
  if (q.includes('bus') || q.includes('transjakarta') || q.includes('transit') || q.includes('krl'))
    return `TransJakarta/KRL is usually the best mix of low effort and low emissions: shared, so per-person CO2 is small, and you skip the traffic.`;
  const green = routes.find((r) => r.greenest);
  return green
    ? `Best balance now is the ${green.label}: ${green.kg} kg CO2 over ${green.distanceKm} km, ~${green.durationMin} min.`
    : `Pick a destination and I'll compare the greenest ways to get there.`;
}

app.listen(PORT, () => console.log(`EcoTrack server on http://0.0.0.0:${PORT}`));
