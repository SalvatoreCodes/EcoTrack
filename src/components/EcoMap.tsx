import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Color, Heat } from '@/theme';
import type { HeatPoint, Place, RouteOption } from '@/lib/types';
import { MAP_HTML } from './mapHtml';

export interface EcoMapProps {
  heat: HeatPoint[];
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

export function EcoMap(props: EcoMapProps) {
  const { heat, routes, selectedId, origin, dest, fitToRoutes, userLocation, centerOnUser, follow, bearing, recenterNonce, onReady, onMapClick } = props;
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const didCenter = useRef(false);

  const call = (fn: string, ...args: unknown[]) => {
    const js = `window.__eco && window.__eco.${fn}(${args.map((a) => JSON.stringify(a)).join(',')}); true;`;
    ref.current?.injectJavaScript(js);
  };

  useEffect(() => { if (ready) call('setHeat', heat); }, [ready, heat]);
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
