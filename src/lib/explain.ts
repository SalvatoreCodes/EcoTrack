import { MODE_LABEL } from './emissions';
import type { RouteOption } from './types';

function pct(a: number, b: number): number {
  if (b <= 0) return 0;
  return Math.round(((b - a) / b) * 100);
}

/** Context-aware opening explanation, built locally from route stats. */
export function introMessage(routes: RouteOption[], selectedId: string | null, destName?: string): string {
  const sel = routes.find((r) => r.id === selectedId) ?? routes.find((r) => r.greenest) ?? routes[0];
  if (!sel) return 'Pick a destination and I’ll compare the greenest ways to get there.';
  const fast = routes.find((r) => r.id === 'fast') ?? routes[0];
  const where = destName ? ` to ${destName}` : '';
  if (sel.id === fast.id) {
    return `The ${sel.label}${where} is also the lowest-emission option here: ${sel.kg} kg CO₂ over ${sel.distanceKm} km. No tradeoff to make.`;
  }
  const saved = pct(sel.kg, fast.kg);
  const extra = sel.durationMin - fast.durationMin;
  return `${sel.label}${where} avoids the worst-air, stop-go stretch where most CO₂ gets burned. It's ${extra > 0 ? `+${extra} min` : 'no slower'} but about −${saved}% emissions (${sel.kg} kg vs ${fast.kg} kg).`;
}

/** Local reply for the demo before the Claude API is wired in. */
export function localReply(question: string, routes: RouteOption[]): string {
  const q = question.toLowerCase();
  const bike = routes.find((r) => r.mode === 'bike');
  if (q.includes('bike') || q.includes('sepeda') || q.includes('cycle')) {
    return bike
      ? `By bike it's ${bike.distanceKm} km, ~${bike.durationMin} min, and 0 kg CO₂. If it's not raining and you're okay arriving warm, it's the greenest and you skip parking.`
      : `This trip is a bit long for a comfortable bike ride, so I'd lean toward the EcoRoute or public transit instead.`;
  }
  if (q.includes('bus') || q.includes('transjakarta') || q.includes('transit') || q.includes('krl')) {
    return `Public transit (TransJakarta / KRL) is usually the best mix of low effort and low emissions: shared so per-person CO₂ is small, and you skip the traffic. I'll pull live corridors once a transit key is connected.`;
  }
  if (q.includes('air') || q.includes('pollution') || q.includes('udara')) {
    return `The EcoRoute is drawn to skirt the high-AQI zones on the heatmap. Idling in bad-air corridors is where both your exposure and emissions spike, so routing around them helps on both.`;
  }
  const green = routes.find((r) => r.greenest);
  return green
    ? `Best balance right now is the ${green.label}: ${green.kg} kg CO₂ over ${green.distanceKm} km, ~${green.durationMin} min by ${MODE_LABEL[green.mode].toLowerCase()}.`
    : `Tell me your destination and I'll compare the options by emissions and convenience.`;
}
