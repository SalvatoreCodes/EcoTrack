import { useEffect, useRef, useState } from 'react';

import { Color, Heat } from '@/theme';
import type { RouteOption } from '@/lib/types';
import { MAP_HTML } from './mapHtml';
import type { EcoMapProps } from './EcoMap';

function toLine(r: RouteOption) {
  return { id: r.id, geometry: r.geometry, color: r.greenest ? Color.accent : Heat[r.level - 1] };
}

export function EcoMap(props: EcoMapProps) {
  const { heat, routes, selectedId, origin, dest, fitToRoutes, userLocation, centerOnUser, follow, bearing, recenterNonce, onReady, onMapClick } = props;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const didCenter = useRef(false);
  // Load from a Blob URL (page origin) instead of srcDoc — srcDoc is a `null`
  // origin which blocks MapLibre's web worker, so geojson/line/heatmap layers never load.
  const [blobUrl] = useState(() => URL.createObjectURL(new Blob([MAP_HTML], { type: 'text/html' })));
  useEffect(() => () => URL.revokeObjectURL(blobUrl), [blobUrl]);

  const call = (fn: string, ...args: unknown[]) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ fn, args }), '*');
  };

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d?.type === 'ready') { setReady(true); onReady?.(); }
        else if (d?.type === 'click') onMapClick?.(d.coord);
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onReady, onMapClick]);

  useEffect(() => { if (ready) call('setHeat', heat); }, [ready, heat]);
  useEffect(() => {
    if (ready) call('setRoutes', (routes ?? []).map(toLine), selectedId ?? null);
  }, [ready, routes, selectedId]);
  useEffect(() => {
    if (ready) call('setMarkers', origin?.coord ?? null, dest?.coord ?? null);
  }, [ready, origin, dest]);
  useEffect(() => {
    if (ready && fitToRoutes && routes && routes.length) call('fit', routes.flatMap((r) => r.geometry));
  }, [ready, fitToRoutes, routes]);
  useEffect(() => {
    if (!ready) return;
    call('setUser', userLocation ?? null);
    if (!userLocation) return;
    if (follow) call('follow', userLocation, 16.5, bearing ?? 0);
    else if (centerOnUser && !didCenter.current) { call('flyTo', userLocation, 14); didCenter.current = true; }
  }, [ready, userLocation, follow, bearing, centerOnUser]);
  useEffect(() => {
    if (ready && recenterNonce && userLocation) call('flyTo', userLocation, 15);
  }, [ready, recenterNonce]);

  return (
    <iframe
      ref={iframeRef}
      src={blobUrl}
      title="EcoTrack map"
      style={{ border: 'none', width: '100%', height: '100%', background: Color.surfaceMap }}
    />
  );
}
