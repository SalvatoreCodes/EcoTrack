/**
 * App data layer — now fully on-device (no server). Keeps the same function shapes the
 * screens already call, so nothing else had to change.
 */
import { ORS_KEY, TOMTOM_KEY, WAQI_TOKEN } from './config';
import { localReply } from './explain';
import { computeRoutes, fetchAir } from './providers';
import type { HeatPoint, Mode, Place, RouteOption } from './types';

export interface ChatMsg {
  role: 'ai' | 'me';
  text: string;
}
export interface ChatContext {
  routes?: RouteOption[];
  selectedId?: string | null;
  destName?: string;
}

export async function getRoutes(origin: Place, dest: Place, mode: Mode): Promise<RouteOption[]> {
  return computeRoutes(origin.coord, dest.coord, mode);
}

export async function getAir(): Promise<{ points: HeatPoint[]; source: 'live' | 'sample' }> {
  return fetchAir();
}

/** On-device assistant: local explainer (no Anthropic key bundled). */
export async function chat(messages: ChatMsg[], context: ChatContext): Promise<{ reply: string; source: string }> {
  const lastUser = [...messages].reverse().find((m) => m.role === 'me')?.text ?? '';
  return { reply: localReply(lastUser, context.routes ?? []), source: 'local' };
}

export interface Health {
  ok: boolean;
  keys: { ors: boolean; waqi: boolean; tomtom: boolean };
  model: string;
}

/** Local status — which bundled provider keys are present. */
export async function health(): Promise<Health | null> {
  return {
    ok: true,
    keys: { ors: !!ORS_KEY, waqi: !!WAQI_TOKEN, tomtom: !!TOMTOM_KEY },
    model: 'on-device · local assistant',
  };
}
