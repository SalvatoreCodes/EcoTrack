import { APP_KEY, SERVER_URL } from './config';
import type { HeatPoint, Mode, Place, RouteOption } from './types';

const appKeyHeader: Record<string, string> = APP_KEY ? { 'x-app-key': APP_KEY } : {};

export interface ChatMsg {
  role: 'ai' | 'me';
  text: string;
}
export interface ChatContext {
  routes?: RouteOption[];
  selectedId?: string | null;
  destName?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(SERVER_URL + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...appKeyHeader },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json() as Promise<T>;
}

export async function getRoutes(origin: Place, dest: Place, mode: Mode): Promise<RouteOption[]> {
  const j = await post<{ routes: RouteOption[] }>('/api/routes', { origin, dest, mode });
  return j.routes;
}

export async function getAir(): Promise<{ points: HeatPoint[]; source: 'live' | 'sample' }> {
  const r = await fetch(SERVER_URL + '/api/air', { headers: appKeyHeader });
  if (!r.ok) throw new Error(`/api/air ${r.status}`);
  return (await r.json()) as { points: HeatPoint[]; source: 'live' | 'sample' };
}

export async function chat(messages: ChatMsg[], context: ChatContext): Promise<{ reply: string; source: string }> {
  return post('/api/chat', { messages, context });
}

export interface Health {
  ok: boolean;
  keys: { ors: boolean; waqi: boolean; tomtom: boolean; anthropic: boolean };
  model: string;
}

export async function health(): Promise<Health | null> {
  try {
    const r = await fetch(SERVER_URL + '/api/health', { headers: appKeyHeader, signal: AbortSignal.timeout(4000) });
    return (await r.json()) as Health;
  } catch {
    return null;
  }
}
