import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Color, Heat } from '@/theme';
import type { HeatPoint, Place, RouteOption } from '@/lib/types';
import type { EmissionRoad } from '@/lib/roads';
import { MAP_HTML } from './mapHtml';

export interface EcoMapProps {
  heat: HeatPoint[];
  emissionRoads?: EmissionRoad[];
  overlay?: 'air' | 'emissions'; // which heat overlay is visible (default 'air')
  routes?: RouteOption[];
  selectedId?: string | null;
  origin?: Place | null;
  dest?: Place | null;
  fitToRoutes?: boolean;
  userLocation?: [number, number] | null;
  centerOnUser?: boolean; // flyTo the user the first time GPS is acquired
  follow?: boolean; // navigation mode: keep camera locked on user
  bearing?: number;
  recenterNonce?: number; // bump to recenter camera on the user
  onReady?: () => void;
  onMapClick?: (coord: [number, number]) => void;
}

function toLine(r: RouteOption) {
  return { id: r.id, geometry: r.geometry, color: r.greenest ? Color.accent : Heat[r.level - 1] };
}

// JSON.stringify does NOT escape <, >, & or any non-ASCII chars (incl. the line/paragraph
// separators U+2028/U+2029). `call()` interpolates these strings into JS that is eval'd inside
// the WebView, so escape every HTML-sensitive and non-printable-ASCII char to \uXXXX — a value
// can then never break out of the script context. Today only numeric coords and route constants
// flow through; this hardens it in case a place name is ever passed.
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/[^\x20-\x7e]|[<>&]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

export function EcoMap(props: EcoMapProps) {
  const { heat, emissionRoads, overlay, routes, selectedId, origin, dest, fitToRoutes, userLocation, centerOnUser, follow, bearing, recenterNonce, onReady, onMapClick } = props;
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const didCenter = useRef(false);

  const call = (fn: string, ...args: unknown[]) => {
    const js = `window.__eco && window.__eco.${fn}(${args.map((a) => safeJson(a)).join(',')}); true;`;
    ref.current?.injectJavaScript(js);
  };

  useEffect(() => { if (ready) call('setHeat', heat); }, [ready, heat]);
  useEffect(() => { if (ready && emissionRoads) call('setEmissionRoads', emissionRoads); }, [ready, emissionRoads]);
  useEffect(() => { if (ready) call('setOverlay', overlay ?? 'air'); }, [ready, overlay]);
  useEffect(() => {
    if (ready) call('setRoutes', (routes ?? []).map(toLine), selectedId ?? null);
  }, [ready, routes, selectedId]);
  useEffect(() => {
    if (ready) call('setMarkers', origin?.coord ?? null, dest?.coord ?? null);
  }, [ready, origin, dest]);
  useEffect(() => {
    if (ready && fitToRoutes && routes && routes.length) {
      call('fit', routes.flatMap((r) => r.geometry));
    }
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

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'ready') { setReady(true); onReady?.(); }
      else if (d.type === 'click') onMapClick?.(d.coord);
    } catch {}
  };

  return (
    <View style={styles.fill}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: MAP_HTML, baseUrl: 'https://localhost/' }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        style={styles.fill}
        containerStyle={styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: Color.surfaceMap } });
