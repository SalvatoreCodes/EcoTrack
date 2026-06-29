/**
 * MapLibre GL JS document rendered inside a WebView (native) or iframe (web).
 * Bridge: RN -> map via window.__eco.<fn>(...) (injected) or postMessage({fn,args}) (iframe).
 *         map -> RN via window.ReactNativeWebView.postMessage(...) or parent.postMessage(...).
 */
export const MAP_HTML = /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html,body,#map { margin:0; height:100%; width:100%; background:#e9eef0; }
  .maplibregl-ctrl-attrib { font-size:9px; }
  .mk { width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4); }
  .mk.from { background:#6b7d73; }
  .mk.to { background:#e5484d; border-radius:3px; }
  .userdot { width:18px;height:18px;border-radius:50%;background:#1b7f4b;border:3px solid #fff;box-shadow:0 0 0 6px rgba(27,127,75,.22),0 1px 5px rgba(0,0,0,.4); }
</style>
</head>
<body>
<div id="map"></div>
<script>
(function () {
  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage(s, '*');
  }

  var map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
                  'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap © CARTO'
        }
      },
      layers: [{ id: 'carto', type: 'raster', source: 'carto' }]
    },
    center: [106.8272, -6.2255],
    zoom: 11.2,
    attributionControl: { compact: true }
  });
  window.__map = map;

  var fromMarker = null, toMarker = null, userMarker = null;

  function ensureSources() {
    if (!map.getSource('heat')) {
      map.addSource('heat', { type: 'geojson', data: fc([]) });
      map.addLayer({
        id: 'heat', type: 'heatmap', source: 'heat',
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'aqi'], 0, 0, 300, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 2.2],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 9, 28, 14, 70],
          'heatmap-opacity': 0.6,
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)', 0.2, '#2ecc71', 0.4, '#a3d911',
            0.6, '#f5c518', 0.8, '#f5a623', 1, '#e5484d']
        }
      });
    }
    if (!map.getSource('emroads')) {
      map.addSource('emroads', { type: 'geojson', data: fc([]) });
      var emColor = ['match', ['get', 'level'], 1, '#2ecc71', 2, '#a3d911', 3, '#f5c518', 4, '#f5a623', '#e5484d'];
      // subtle thin colored line — sits alongside the air-quality heatmap
      map.addLayer({
        id: 'emroads-line', type: 'line', source: 'emroads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': emColor,
          'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2, 14, 5],
          'line-opacity': 0.5
        }
      });
    }
    if (!map.getSource('routes')) {
      map.addSource('routes', { type: 'geojson', data: fc([]) });
      map.addLayer({
        id: 'routes', type: 'line', source: 'routes',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': ['get', 'opacity']
        }
      });
    }
  }

  function fc(features) { return { type: 'FeatureCollection', features: features }; }

  window.__eco = {
    setHeat: function (points) {
      ensureSources();
      map.getSource('heat').setData(fc((points || []).map(function (p) {
        return { type: 'Feature', properties: { aqi: p.aqi },
          geometry: { type: 'Point', coordinates: p.coord } };
      })));
    },
    setEmissionRoads: function (roads) {
      ensureSources();
      map.getSource('emroads').setData(fc((roads || []).map(function (r) {
        return { type: 'Feature', properties: { level: r.level },
          geometry: { type: 'LineString', coordinates: r.coords } };
      })));
    },
    setRoutes: function (routes, selectedId) {
      ensureSources();
      var feats = (routes || []).map(function (r) {
        var sel = r.id === selectedId;
        return { type: 'Feature',
          properties: { color: r.color, width: sel ? 6 : 4, opacity: sel ? 1 : 0.55 },
          geometry: { type: 'LineString', coordinates: r.geometry } };
      });
      // draw selected last (on top)
      feats.sort(function (a, b) { return a.properties.opacity - b.properties.opacity; });
      map.getSource('routes').setData(fc(feats));
    },
    setMarkers: function (origin, dest) {
      if (fromMarker) { fromMarker.remove(); fromMarker = null; }
      if (toMarker) { toMarker.remove(); toMarker = null; }
      if (origin) { var f = document.createElement('div'); f.className = 'mk from';
        fromMarker = new maplibregl.Marker({ element: f }).setLngLat(origin).addTo(map); }
      if (dest) { var t = document.createElement('div'); t.className = 'mk to';
        toMarker = new maplibregl.Marker({ element: t }).setLngLat(dest).addTo(map); }
    },
    setUser: function (coord) {
      if (!coord) { if (userMarker) { userMarker.remove(); userMarker = null; } return; }
      if (!userMarker) {
        var el = document.createElement('div'); el.className = 'userdot';
        userMarker = new maplibregl.Marker({ element: el }).setLngLat(coord).addTo(map);
      } else userMarker.setLngLat(coord);
    },
    follow: function (coord, zoom, bearing) {
      if (!coord) return;
      map.easeTo({ center: coord, zoom: zoom || 16.5, bearing: bearing || 0, pitch: 50, duration: 700 });
    },
    flyTo: function (coord, zoom) { map.flyTo({ center: coord, zoom: zoom || 13, duration: 600 }); },
    fit: function (coords) {
      if (!coords || !coords.length) return;
      var b = coords.reduce(function (acc, c) { return acc.extend(c); },
        new maplibregl.LngLatBounds(coords[0], coords[0]));
      map.fitBounds(b, { padding: { top: 90, bottom: 320, left: 60, right: 60 }, duration: 600 });
    }
  };

  // iframe (web) inbound bridge
  window.addEventListener('message', function (e) {
    try {
      var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (d && d.fn && window.__eco[d.fn]) window.__eco[d.fn].apply(null, d.args || []);
    } catch (err) {}
  });

  map.on('load', function () { ensureSources(); send({ type: 'ready' }); });
  map.on('click', function (e) { send({ type: 'click', coord: [e.lngLat.lng, e.lngLat.lat] }); });
})();
</script>
</body>
</html>`;
